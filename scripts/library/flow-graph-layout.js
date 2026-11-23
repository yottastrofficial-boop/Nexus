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

export function getFlowGraphCanvasSize(graph, { nodeWidth = 220, nodeHeight = 240, padding = 80 } = {}) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  return {
    width: Math.max(720, ...nodes.map(node => (Number(node.x) || 0) + nodeWidth + padding)),
    height: Math.max(360, ...nodes.map(node => (Number(node.y) || 0) + nodeHeight + padding))
  };
}
