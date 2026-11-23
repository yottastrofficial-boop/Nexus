/**
 * Deterministic layout helpers for the Flow graph editor.
 * Coordinates are editor metadata; the runtime ignores them.
 */
export function layoutFlowGraph(graph, { force = false, columnGap = 280, rowGap = 180 } = {}) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new TypeError("Grafo inválido para organização visual.");
  }
  const next = structuredClone(graph);
  const nodes = new Map(next.nodes.map(node => [node.id, node]));
  const outgoing = new Map(next.nodes.map(node => [node.id, []]));
  const incoming = new Map(next.nodes.map(node => [node.id, 0]));
  for (const edge of next.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
    outgoing.get(edge.from).push(edge);
    incoming.set(edge.to, incoming.get(edge.to) + 1);
  }

  const rank = new Map();
  const queue = [];
  for (const node of next.nodes) {
    if (incoming.get(node.id) === 0) {
      rank.set(node.id, 0);
      queue.push(node.id);
    }
  }
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    for (const edge of outgoing.get(id)) {
      const candidate = (rank.get(id) ?? 0) + 1;
      rank.set(edge.to, Math.max(rank.get(edge.to) ?? 0, candidate));
      incoming.set(edge.to, incoming.get(edge.to) - 1);
      if (incoming.get(edge.to) === 0) queue.push(edge.to);
    }
  }

  const layers = new Map();
  for (const node of next.nodes) {
    const layer = rank.get(node.id) ?? 0;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer).push(node);
  }
  for (const [layer, items] of layers) {
    items.forEach((node, index) => {
      if (!force && Number.isFinite(node.x) && Number.isFinite(node.y)) return;
      node.x = 40 + layer * columnGap;
      node.y = 40 + index * rowGap;
    });
  }
  return next;
}

export function getFlowGraphCanvasSize(graph, { nodeWidth = 220, nodeHeight = 300, padding = 80 } = {}) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  return {
    width: Math.max(720, ...nodes.map(node => (Number(node.x) || 0) + nodeWidth + padding)),
    height: Math.max(360, ...nodes.map(node => (Number(node.y) || 0) + nodeHeight + padding))
  };
}

/**
 * Adds or rewires one explicit outgoing branch while preventing malformed edges
 * and cycles before the user reaches schema validation.
 */
export function connectFlowNodes(graph, fromId, toId, when = "next") {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new TypeError("Grafo inválido para criar conexão.");
  }
  const next = structuredClone(graph);
  const from = next.nodes.find(node => node.id === fromId);
  const to = next.nodes.find(node => node.id === toId);
  if (!from || !to) throw new Error("Selecione dois nós existentes.");
  if (fromId === toId) throw new Error("Um nó não pode se conectar a si mesmo.");
  if (to.type === "start") throw new Error("O nó inicial não pode receber conexões.");
  if (from.type === "end") throw new Error("Um nó final não pode ter saídas.");
  const branch = String(when ?? "next");
  const allowed = from.type === "condition" ? ["true", "false"] : ["next"];
  if (!allowed.includes(branch)) {
    throw new Error(from.type === "condition"
      ? "Condições precisam usar a saída Verdadeiro ou Falso."
      : "Este tipo de nó só aceita a saída Próxima.");
  }

  const outgoing = new Map(next.nodes.map(node => [node.id, []]));
  for (const edge of next.edges) {
    if (outgoing.has(edge.from)) outgoing.get(edge.from).push(edge.to);
  }
  const pending = [toId], visited = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (current === fromId) throw new Error("Essa conexão criaria um ciclo no fluxo.");
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(outgoing.get(current) ?? []));
  }

  const existing = next.edges.findIndex(edge => edge.from === fromId && (edge.when ?? "next") === branch);
  const replacement = { from: fromId, to: toId, when: branch };
  if (existing >= 0) next.edges[existing] = replacement;
  else {
    if (next.edges.length >= 128) throw new Error("O grafo atingiu o limite de 128 conexões.");
    next.edges.push(replacement);
  }
  return next;
}
