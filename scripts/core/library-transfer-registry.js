const ID_PATTERN = /^[a-z][a-z0-9._-]{1,63}$/i;
const DEFAULT_LIMITS = Object.freeze({ maxItems: 2000, maxDepth: 20, maxBytes: 5 * 1024 * 1024 });

function cloneTransferData(value, depth = 0, maxDepth = DEFAULT_LIMITS.maxDepth, budget = { nodes: 0, bytes: 0, maxNodes: 100000, maxBytes: DEFAULT_LIMITS.maxBytes }) {
  if (depth > maxDepth) throw new Error("Pacote de transferência excede a profundidade permitida.");
  budget.nodes++;
  if (budget.nodes > budget.maxNodes) throw new Error("Pacote de transferência contém dados demais.");
  if (typeof value === "string") { budget.bytes += value.length; if (budget.bytes > budget.maxBytes) throw new Error("Pacote de transferência excede o limite de tamanho."); return value; }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Pacote de transferência contém número inválido.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 10000) throw new Error("Pacote de transferência contém uma lista grande demais.");
    return value.map(item => cloneTransferData(item, depth + 1, maxDepth, budget));
  }
  if (!value || typeof value !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error("Pacote de transferência aceita somente dados JSON simples.");
  }
  const entries = Object.entries(value);
  if (entries.length > 10000) throw new Error("Pacote de transferência contém um objeto grande demais.");
  const result = {};
  for (const [key, child] of entries) {
    budget.bytes += key.length;
    if (budget.bytes > budget.maxBytes) throw new Error("Pacote de transferência excede o limite de tamanho.");
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("Pacote de transferência contém chave proibida.");
    result[key] = cloneTransferData(child, depth + 1, maxDepth, budget);
  }
  return result;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function normalizePackage(raw, limits) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("A origem não retornou um pacote de transferência.");
  if (!Array.isArray(raw.items) || raw.items.length > limits.maxItems) throw new Error("Pacote inválido ou acima do limite de itens.");
  const budget = { nodes: 0, bytes: 0, maxNodes: limits.maxNodes, maxBytes: limits.maxBytes };
  const items = raw.items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Item de transferência inválido na posição " + index + ".");
    const type = String(item.type ?? "").trim();
    const name = String(item.name ?? "").trim();
    if (!/^[a-z][a-z0-9._-]{0,63}$/i.test(type) || !name || name.length > 160) throw new Error("Item de transferência sem tipo ou nome válido.");
    const data = cloneTransferData(item.data ?? {}, 0, limits.maxDepth, budget);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Dados do item precisam ser um objeto.");
    return deepFreeze({
      id: String(item.id ?? "item-" + index).slice(0, 192),
      type,
      name,
      sourceId: String(item.sourceId ?? item.id ?? "").slice(0, 192),
      data
    });
  });
  const metadata = cloneTransferData(raw.metadata ?? {}, 0, limits.maxDepth, budget);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("Metadados do pacote precisam ser um objeto.");
  const parsedVersion = Number(raw.version);
  const version = Number.isFinite(parsedVersion) && parsedVersion >= 1 ? parsedVersion : 1;
  const transfer = { format: String(raw.format ?? "unknown").slice(0, 80), version, metadata, items };
  const size = new TextEncoder().encode(JSON.stringify(transfer)).length;
  if (size > limits.maxBytes) throw new Error("Pacote de transferência excede o limite de tamanho.");
  return deepFreeze(transfer);
}

/**
 * Registry for trusted source/destination adapters. Imported payloads remain
 * inert JSON; adapters own format conversion and destination-specific preview.
 */
export function createLibraryTransferRegistry({ limits = {}, createPlanId } = {}) {
  const safeLimits = {
    maxItems: Math.max(1, Math.min(10000, Number(limits.maxItems) || DEFAULT_LIMITS.maxItems)),
    maxDepth: Math.max(1, Math.min(40, Number(limits.maxDepth) || DEFAULT_LIMITS.maxDepth)),
    maxBytes: Math.max(1024, Math.min(25 * 1024 * 1024, Number(limits.maxBytes) || DEFAULT_LIMITS.maxBytes)),
    maxNodes: Math.max(1000, Math.min(500000, Number(limits.maxNodes) || 100000)),
    maxPendingPlans: Math.max(1, Math.min(500, Number(limits.maxPendingPlans) || 100))
  };
  const sources = new Map();
  const destinations = new Map();
  const plans = new Map();
  const makePlanId = createPlanId ?? (() => globalThis.crypto?.randomUUID?.() ?? "transfer-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10));

  const registerSource = adapter => {
    const id = String(adapter?.id ?? "").trim();
    if (!ID_PATTERN.test(id) || !String(adapter?.label ?? "").trim() || typeof adapter?.read !== "function") {
      throw new TypeError("Adaptador de origem precisa de ID, rótulo e read().");
    }
    if (sources.has(id)) throw new Error("Adaptador de origem já registrado: " + id);
    const record = Object.freeze({ ...adapter, id, label: String(adapter.label).trim().slice(0, 100) });
    sources.set(id, record);
    return () => sources.get(id) === record ? sources.delete(id) : false;
  };

  const registerDestination = adapter => {
    const id = String(adapter?.id ?? "").trim();
    if (!ID_PATTERN.test(id) || !String(adapter?.label ?? "").trim() ||
      typeof adapter?.supports !== "function" || typeof adapter?.preview !== "function" || typeof adapter?.commit !== "function") {
      throw new TypeError("Adaptador de destino precisa de ID, rótulo, supports(), preview() e commit().");
    }
    if (destinations.has(id)) throw new Error("Adaptador de destino já registrado: " + id);
    const record = Object.freeze({ ...adapter, id, label: String(adapter.label).trim().slice(0, 100) });
    destinations.set(id, record);
    return () => destinations.get(id) === record ? destinations.delete(id) : false;
  };

  const prepare = async ({ sourceId, destinationId, input, context = {} } = {}) => {
    const source = sources.get(String(sourceId ?? ""));
    const destination = destinations.get(String(destinationId ?? ""));
    if (!source) throw new Error("Adaptador de origem indisponível: " + sourceId);
    if (!destination) throw new Error("Adaptador de destino indisponível: " + destinationId);
    if (plans.size >= safeLimits.maxPendingPlans) throw new Error("Limite de prévias pendentes atingido; descarte prévias antigas antes de continuar.");
    const transfer = normalizePackage(await source.read(input, context), safeLimits);
    const supported = [], unsupported = [];
    for (const item of transfer.items) {
      if ((await destination.supports(item, context)) === true) supported.push(item);
      else unsupported.push({ id: item.id, type: item.type, name: item.name, reason: "Tipo não compatível com o destino." });
    }
    const rawDestinationPreview = await destination.preview(Object.freeze(supported), { context, metadata: transfer.metadata, format: transfer.format, version: transfer.version });
    const destinationPreview = deepFreeze(cloneTransferData(rawDestinationPreview ?? {}, 0, safeLimits.maxDepth));
    const planId = String(makePlanId());
    if (!planId || plans.has(planId)) throw new Error("Não foi possível criar um identificador exclusivo para a prévia.");
    const preview = deepFreeze({
      planId,
      source: { id: source.id, label: source.label },
      destination: { id: destination.id, label: destination.label },
      format: transfer.format,
      version: transfer.version,
      total: transfer.items.length,
      compatible: supported.length,
      unsupported,
      destinationPreview
    });
    plans.set(planId, { source, destination, transfer, supported, destinationPreview, context, state: "prepared" });
    return preview;
  };

  const commit = async (planId, context = undefined) => {
    const id = String(planId ?? "");
    const plan = plans.get(id);
    if (!plan) throw new Error("Prévia de transferência inexistente, expirada ou já confirmada.");
    if (plan.state !== "prepared") throw new Error("Esta transferência já está em processamento.");
    if (destinations.get(plan.destination.id) !== plan.destination) throw new Error("O adaptador de destino foi removido; gere uma nova prévia.");
    plan.state = "committing";
    try {
      const result = await plan.destination.commit(plan.destinationPreview, Object.freeze(plan.supported), {
        context: context ?? plan.context,
        metadata: plan.transfer.metadata,
        format: plan.transfer.format,
        version: plan.transfer.version
      });
      plan.state = "committed";
      plans.delete(id);
      return result;
    } catch (error) {
      plan.state = "prepared";
      throw error;
    }
  };

  const discard = planId => plans.delete(String(planId ?? ""));
  return Object.freeze({
    registerSource,
    registerDestination,
    listSources: () => [...sources.values()].map(({ id, label }) => ({ id, label })),
    listDestinations: () => [...destinations.values()].map(({ id, label }) => ({ id, label })),
    prepare,
    commit,
    discard,
    get pendingPlans() { return plans.size; }
  });
}
