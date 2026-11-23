import { INTERACTION_EVENTS } from "../core/interactions.js";

const clone = value => structuredClone(value ?? {});
const newId = prefix => prefix + "-" + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const make = (tag, className, value = "") => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== "") element.textContent = String(value);
  return element;
};

export function buildLogicEditorPayload(type, basePayload = {}, draft = {}) {
  const payload = clone(basePayload);
  const value = key => String(draft[key] ?? "");
  const parseArray = key => {
    if (Array.isArray(draft[key])) return clone(draft[key]);
    let parsed;
    try { parsed = JSON.parse(value(key) || "[]"); }
    catch { throw new Error(key + ": JSON inválido."); }
    if (!Array.isArray(parsed)) throw new Error(key + ": informe uma lista JSON.");
    return parsed;
  };
  if (type === "property") {
    const path = value("path").trim();
    if (!path) throw new Error("Informe o caminho da propriedade.");
    payload.path = path;
    payload.valueType = value("valueType") || "string";
    if (draft.hasDefault === true) {
      try { payload.defaultValue = JSON.parse(value("defaultValue")); }
      catch { throw new Error("Valor padrão precisa ser JSON válido (ex.: 0, false ou \"texto\")."); }
    } else delete payload.defaultValue;
  } else if (type === "rule") {
    const expression = value("expression").trim();
    if (!expression) throw new Error("Informe a expressão da regra.");
    payload.expression = expression;
    payload.resultType = value("resultType") || "boolean";
    delete payload.formula;
  } else if (type === "behavior") {
    const events = value("events").split(",").map(item => item.trim()).filter(Boolean);
    payload.events = events;
    const flowId = value("flowId").trim();
    if (flowId) payload.flowId = flowId;
    else delete payload.flowId;
    delete payload.event;
  } else if (type === "flow") {
    for (const key of ["triggers", "conditions", "actions"]) payload[key] = parseArray(key);
    payload.conditionJoin = value("conditionJoin") === "any" ? "any" : "all";
    payload.execution = { ...(isRecord(payload.execution) ? payload.execution : {}), onError: value("onError") === "continue" ? "continue" : "stop" };
  } else if (type === "function") {
    const functionId = value("functionId").trim();
    if (!functionId) throw new Error("Informe o identificador da função registrada.");
    payload.functionId = functionId;
    payload.signature = value("signature").trim();
    payload.returnType = value("returnType") || "any";
    payload.arguments = parseArray("arguments");
  } else {
    throw new Error("Não existe editor especializado para este tipo lógico.");
  }
  return payload;
}
const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function createFlowBuilder(form, payload, runtime) {
  const root = make("div", "nexus-library-flow-builder");
  const types = [...new Set(runtime?.actionTypes ?? [])];
  const data = { triggers: Array.isArray(payload.triggers) ? clone(payload.triggers) : [], conditions: Array.isArray(payload.conditions) ? clone(payload.conditions) : [], actions: Array.isArray(payload.actions) ? clone(payload.actions) : [] };
  const sections = {};
  const field = (title, control, wide = false) => { const label = make("label", "nexus-library-flow-field" + (wide ? " wide" : "")); label.append(make("span", "", title), control); return label; };
  const text = (value, placeholder) => { const node = make("input", ""); node.type = "text"; node.value = String(value ?? ""); node.placeholder = placeholder ?? ""; return node; };
  const select = (value, options) => { const node = make("select", ""); options.forEach(pair => { const opt = make("option", "", pair[1]); opt.value = pair[0]; opt.selected = pair[0] === value; node.append(opt); }); return node; };
  const remove = callback => { const button = make("button", "nexus-library-flow-remove", "Remover"); button.type = "button"; button.addEventListener("click", callback); return button; };
  const section = (key, title, description, rowFactory, fresh) => {
    const group = make("section", "nexus-library-flow-group"); const head = make("div", "nexus-library-flow-group-head");
    const intro = make("div", ""); intro.append(make("strong", "", title), make("small", "", description));
    const rows = make("div", "nexus-library-flow-rows");
    const render = () => { rows.replaceChildren(); data[key].forEach((item, index) => rows.append(rowFactory(item, () => { data[key].splice(index, 1); render(); }))); if (!data[key].length) rows.append(make("p", "nexus-library-flow-empty", "Nenhum item configurado.")); };
    const add = make("button", "nexus-library-flow-add", "+ Adicionar"); add.type = "button"; add.addEventListener("click", () => { data[key].push(fresh()); render(); });
    head.append(intro, add); group.append(head, rows); root.append(group); sections[key] = rows; render();
  };
  section("triggers", "Gatilhos", "Eventos que iniciam o fluxo.", (item, onRemove) => {
    const row = make("article", "nexus-library-flow-row"); row.dataset.id = item.id ?? newId("trigger");
    const event = select(item.event ?? INTERACTION_EVENTS[0], INTERACTION_EVENTS.map(value => [value, value])); event.dataset.field = "event";
    const modifiers = text(Array.isArray(item.modifiers) ? item.modifiers.join("+") : item.modifiers, "ctrl+shift"); modifiers.dataset.field = "modifiers";
    const key = text(item.key, "Tecla opcional"); key.dataset.field = "key";
    const duration = text(item.durationMs, "600"); duration.dataset.field = "durationMs";
    row.append(field("Evento", event), field("Modificadores", modifiers), field("Tecla", key), field("Duração (ms)", duration), remove(onRemove)); return row;
  }, () => ({ id: newId("trigger"), event: INTERACTION_EVENTS[0] }));
  section("conditions", "Condições", "Expressões avaliadas antes das ações pelo parser seguro.", (item, onRemove) => {
    const row = make("article", "nexus-library-flow-row"); row.dataset.id = item.id ?? newId("condition");
    const expression = make("textarea", ""); expression.rows = 2; expression.spellcheck = false; expression.value = item.expression ?? ""; expression.placeholder = "@system.resources.pv.value > 0"; expression.dataset.field = "expression";
    row.append(field("Expressão", expression, true), remove(onRemove)); return row;
  }, () => ({ id: newId("condition"), expression: "" }));
  section("actions", "Ações", "Executores devem ser registrados pelo Core ou por módulos confiáveis.", (item, onRemove) => {
    const row = make("article", "nexus-library-flow-row"); row.dataset.id = item.id ?? newId("action");
    const name = text(item.name, "Nome opcional"); name.dataset.field = "name";
    const options = [...types]; if (item.type && !options.includes(item.type)) options.push(item.type);
    const type = options.length ? select(item.type ?? "", options.map(value => [value, value])) : text(item.type, "namespace.acao"); type.dataset.field = "type";
    const enabled = make("input", ""); enabled.type = "checkbox"; enabled.checked = item.enabled !== false; enabled.dataset.field = "enabled";
    const config = make("textarea", ""); config.rows = 3; config.spellcheck = false; config.value = JSON.stringify(item.config ?? {}, null, 2); config.dataset.field = "config";
    const active = make("label", "nexus-library-flow-enabled"); active.append(enabled, make("span", "", "Ação ativa"));
    row.append(field("Nome", name), field("Tipo do executor", type), field("Configuração (JSON)", config, true), active, remove(onRemove)); return row;
  }, () => ({ id: newId("action"), type: types[0] ?? "", enabled: true, config: {} }));
  form.append(root);
  return { read() {
    const result = {};
    for (const key of Object.keys(data)) result[key] = [...sections[key].querySelectorAll(".nexus-library-flow-row")].map(row => {
      const get = name => row.querySelector('[data-field="' + name + '"]'); const id = row.dataset.id;
      if (key === "triggers") return { id, event: get("event").value, modifiers: get("modifiers").value.split("+").map(x => x.trim()).filter(Boolean), key: get("key").value, durationMs: get("durationMs").value ? Number(get("durationMs").value) : undefined };
      if (key === "conditions") return { id, expression: get("expression").value };
      let config; try { config = JSON.parse(get("config").value || "{}"); } catch { throw new Error("Configuração da ação deve ser JSON válido."); }
      if (!isRecord(config)) throw new Error("Configuração da ação deve ser um objeto JSON.");
      return { id, name: get("name").value, type: get("type").value, enabled: get("enabled").checked, config };
    });
    return result;
  } };
}

export function createLogicAssetEditor({ asset, runtime = null, onSave } = {}) {
  if (!asset || !["property", "rule", "behavior", "flow", "function"].includes(asset.type)) return null;
  if (typeof onSave !== "function") throw new TypeError("O editor lógico precisa de um callback de salvamento.");
  const payload = clone(asset.payload);
  const section = make("section", "nexus-library-logic-editor");
  const heading = make("h4", "", "Editor de " + ({
    property: "Propriedades", rule: "Regras", behavior: "Comportamentos", flow: "Fluxos", function: "Funções"
  }[asset.type]));
  const note = make("p", "nexus-library-logic-editor-note");
  const form = make("form", "nexus-library-logic-editor-form");
  const fields = {};
  let flowBuilder = null;
  const addInput = (key, labelText, value, inputType = "text") => {
    const label = make("label", "nexus-library-logic-field");
    label.append(make("span", "", labelText));
    const input = make("input", "");
    input.type = inputType;
    input.name = key;
    input.value = value == null ? "" : String(value);
    fields[key] = input;
    label.append(input);
    form.append(label);
  };
  const addCheckbox = (key, labelText, checked) => {
    const label = make("label", "nexus-library-logic-field nexus-library-logic-checkbox");
    const input = make("input", "");
    input.type = "checkbox";
    input.name = key;
    input.checked = checked === true;
    fields[key] = input;
    label.append(input, make("span", "", labelText));
    form.append(label);
  };
  const addSelect = (key, labelText, value, options) => {
    const label = make("label", "nexus-library-logic-field");
    label.append(make("span", "", labelText));
    const select = make("select", "");
    select.name = key;
    for (const option of options) {
      const node = make("option", "", option[1]);
      node.value = option[0];
      node.selected = option[0] === value;
      select.append(node);
    }
    fields[key] = select;
    label.append(select);
    form.append(label);
  };
  const addTextarea = (key, labelText, value, rows = 4) => {
    const label = make("label", "nexus-library-logic-field nexus-library-logic-field-wide");
    label.append(make("span", "", labelText));
    const textarea = make("textarea", "");
    textarea.name = key;
    textarea.rows = rows;
    textarea.spellcheck = false;
    textarea.value = typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2);
    fields[key] = textarea;
    label.append(textarea);
    form.append(label);
  };

  if (asset.type === "property") {
    note.textContent = "Defina o caminho e o tipo. Valores padrão são dados JSON, não código.";
    addInput("path", "Caminho da propriedade", payload.path ?? payload.key ?? "");
    addSelect("valueType", "Tipo do valor", payload.valueType ?? "string", [
      ["string", "Texto"], ["number", "Número"], ["boolean", "Verdadeiro/falso"],
      ["array", "Lista"], ["object", "Objeto"], ["formula", "Expressão"]
    ]);
    addCheckbox("hasDefault", "Definir valor padrão", hasOwn(payload, "defaultValue"));
    addInput("defaultValue", "Valor padrão (JSON)", hasOwn(payload, "defaultValue") ? JSON.stringify(payload.defaultValue) : "");
  } else if (asset.type === "rule") {
    note.textContent = "Expressões usam o parser seguro do NEXUS; não aceitam JavaScript.";
    addTextarea("expression", "Expressão", payload.expression ?? payload.formula ?? "", 4);
    addSelect("resultType", "Resultado esperado", payload.resultType ?? "boolean", [
      ["boolean", "Verdadeiro/falso"], ["number", "Número"], ["string", "Texto"]
    ]);
  } else if (asset.type === "behavior") {
    note.textContent = "O comportamento reage a eventos e referencia um fluxo registrado. Não contém scripts.";
    addInput("events", "Eventos (separados por vírgula)", Array.isArray(payload.events) ? payload.events.join(", ") : payload.event ?? "");
    addInput("flowId", "ID do fluxo", payload.flowId ?? "");
    const available = runtime?.actionTypes ?? [];
    note.textContent += available.length ? " Ações registradas: " + available.join(", ") : " Nenhum executor de ação está registrado no runtime nesta sessão.";
  } else if (asset.type === "flow") {
    note.textContent = "Gatilhos, condições e ações são dados declarativos. Tipos de ação precisam de executores registrados.";
    flowBuilder = createFlowBuilder(form, payload, runtime);
    addSelect("conditionJoin", "Combinar condições", payload.conditionJoin ?? "all", [["all", "Todas (AND)"], ["any", "Qualquer (OR)"]]);
    addSelect("onError", "Em caso de erro", payload.execution?.onError ?? "stop", [["stop", "Interromper"], ["continue", "Continuar"]]);
    const available = runtime?.actionTypes ?? [];
    note.textContent += available.length ? " Ações registradas: " + available.join(", ") : " Nenhum executor de ação está registrado no runtime nesta sessão.";
  } else if (asset.type === "function") {
    note.textContent = "Este editor registra metadados e a referência de uma função confiável. A implementação executável vem do Core ou de um módulo.";
    addInput("functionId", "ID da função registrada", payload.functionId ?? "");
    addInput("signature", "Assinatura", payload.signature ?? "");
    addSelect("returnType", "Tipo de retorno", payload.returnType ?? "any", [
      ["any", "Qualquer"], ["void", "Sem retorno"], ["string", "Texto"],
      ["number", "Número"], ["boolean", "Verdadeiro/falso"], ["object", "Objeto"], ["array", "Lista"]
    ]);
    addTextarea("arguments", "Argumentos (JSON)", payload.arguments ?? [], 4);
    const available = runtime?.functionIds ?? [];
    note.textContent += available.length ? " Funções registradas: " + available.join(", ") : " Nenhuma implementação de função está registrada no runtime nesta sessão.";
  }

  const actions = make("div", "nexus-library-logic-editor-actions");
  const save = make("button", "nexus-library-logic-editor-save", "Salvar definição");
  save.type = "submit";
  const status = make("p", "nexus-library-logic-editor-status");
  actions.append(save);
  form.append(actions, status);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    save.disabled = true;
    status.textContent = "Validando e salvando…";
    try {
      const draft = {};
      for (const [key, input] of Object.entries(fields)) {
        if (key === "hasDefault") draft.hasDefault = input.checked === true;
        else if (key === "defaultValue") draft.defaultValue = input.value;
        else draft[key] = input.value;
      }
      if (flowBuilder) Object.assign(draft, flowBuilder.read());
      const nextPayload = buildLogicEditorPayload(asset.type, payload, draft);
      await onSave({ ...asset, payload: nextPayload });
      status.textContent = "Definição salva e validada.";
    } catch (error) {
      status.textContent = String(error?.message ?? error);
    } finally {
      save.disabled = false;
    }
  });
  section.append(heading, note, form);
  return section;
}
