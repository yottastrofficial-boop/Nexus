/**
 * Shared contact geometry for Canvas surfaces.
 * Runs in every sheet mode, not only while the Appearance editor is active.
 */
const cornerNames = ["tl", "tr", "br", "bl"];
const sideNames = ["top", "right", "bottom", "left"];
const observerByCanvas = new WeakMap();
/**
 * Enumerate only surface pairs whose bounding boxes can touch.
 * A horizontal sweep avoids comparing every distant pair on large canvases.
 * Returned indices refer to the original rectangles array.
 */
export function* iterateCanvasContactPairs(rectangles = [], tolerance = 2.5) {
  const ordered = rectangles
    .map((rect, index) => ({ rect, index }))
    .sort((a, b) => a.rect.left - b.rect.left || a.index - b.index);

  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    for (let j = i + 1; j < ordered.length; j++) {
      const b = ordered[j];
      if (b.rect.left > a.rect.right + tolerance) break;
      if (b.rect.top > a.rect.bottom + tolerance || b.rect.bottom < a.rect.top - tolerance) continue;
      yield [a.index, b.index];
    }
  }
}

const getRect = node => {
  const rect = node.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
};

export function updateCanvasConnectedCorners(canvas, tolerance = 2.5) {
  if (!canvas?.querySelectorAll) return { surfaces: 0, contacts: 0 };
  const allComponents = [...canvas.querySelectorAll(".nexus-component")];
  for (const node of allComponents) {
    const rect = getRect(node);
    const width = Number.parseFloat(node.style?.width) || node.offsetWidth || rect.width;
    const height = Number.parseFloat(node.style?.height) || node.offsetHeight || rect.height;
    if (width < 100 || height < 100) node.classList.add("is-compact");
    else node.classList.remove("is-compact");
  }
  const components = allComponents.filter(node => !node.classList.contains("is-group-member"));
  const groups = [...canvas.querySelectorAll(".nexus-group-surface")];
  // Group surfaces are independent rounded containers. Component contact logic must not square their corners.
  const surfaces = components.map(node => ({ node, prefix: "nexus-component" }));
  for (const { node, prefix } of surfaces) node.classList.remove(
    ...cornerNames.map(name => prefix + "-corner-square-" + name),
    ...sideNames.map(side => prefix + "-touching-" + side)
  );
  const visible = surfaces.map(surface => ({ ...surface, rect: getRect(surface.node) }))
    .filter(item => !item.node.hidden && item.rect.width > 0 && item.rect.height > 0);
  const pointTouchesBorder = (point, rect) => {
    const horizontal = (Math.abs(point.y - rect.top) <= tolerance || Math.abs(point.y - rect.bottom) <= tolerance)
      && point.x >= rect.left - tolerance && point.x <= rect.right + tolerance;
    const vertical = (Math.abs(point.x - rect.left) <= tolerance || Math.abs(point.x - rect.right) <= tolerance)
      && point.y >= rect.top - tolerance && point.y <= rect.bottom + tolerance;
    return horizontal || vertical;
  };
  let contacts = 0;
  for (const [i, j] of iterateCanvasContactPairs(visible.map(item => item.rect), tolerance)) {
    const a = visible[i], b = visible[j];
    const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
    const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
    let touching = false;
    if (overlapX > tolerance) {
      if (Math.abs(a.rect.bottom - b.rect.top) <= tolerance) { a.node.classList.add(a.prefix + "-touching-bottom"); b.node.classList.add(b.prefix + "-touching-top"); touching = true; }
      if (Math.abs(a.rect.top - b.rect.bottom) <= tolerance) { a.node.classList.add(a.prefix + "-touching-top"); b.node.classList.add(b.prefix + "-touching-bottom"); touching = true; }
    }
    if (overlapY > tolerance) {
      if (Math.abs(a.rect.right - b.rect.left) <= tolerance) { a.node.classList.add(a.prefix + "-touching-right"); b.node.classList.add(b.prefix + "-touching-left"); touching = true; }
      if (Math.abs(a.rect.left - b.rect.right) <= tolerance) { a.node.classList.add(a.prefix + "-touching-left"); b.node.classList.add(b.prefix + "-touching-right"); touching = true; }
    }
    const cornersA = [{name:"tl",x:a.rect.left,y:a.rect.top},{name:"tr",x:a.rect.right,y:a.rect.top},{name:"br",x:a.rect.right,y:a.rect.bottom},{name:"bl",x:a.rect.left,y:a.rect.bottom}];
    const cornersB = [{name:"tl",x:b.rect.left,y:b.rect.top},{name:"tr",x:b.rect.right,y:b.rect.top},{name:"br",x:b.rect.right,y:b.rect.bottom},{name:"bl",x:b.rect.left,y:b.rect.bottom}];
    for (const corner of cornersA) if (pointTouchesBorder(corner,b.rect)) { a.node.classList.add(a.prefix + "-corner-square-" + corner.name); touching = true; }
    for (const corner of cornersB) if (pointTouchesBorder(corner,a.rect)) { b.node.classList.add(b.prefix + "-corner-square-" + corner.name); touching = true; }
    if (touching) contacts++;
  }
  return { surfaces: visible.length, contacts };
}

export function observeCanvasConnectedCorners(canvas) {
  if (!canvas?.querySelectorAll || (typeof ResizeObserver !== "function" && typeof MutationObserver !== "function")) return;
  let record = observerByCanvas.get(canvas);
  if (!record) {
    let frame = 0;
    const schedule = () => {
      // Pointer and keyboard gestures already perform one final scan on release.
      if (canvas.dataset?.nexusGestureActive === "true" || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; updateCanvasConnectedCorners(canvas); });
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    const mutationObserver = typeof MutationObserver === "function" ? new MutationObserver(schedule) : null;
    // Position changes do not trigger ResizeObserver. Watch inline geometry and
    // inserted/removed surfaces so corner classes stay correct after Inspector edits.
    mutationObserver?.observe(canvas, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
    record = { observer, mutationObserver, observed: new Set(), schedule };
    observerByCanvas.set(canvas, record);
  }
  const current = new Set([...canvas.querySelectorAll(".nexus-component"), ...canvas.querySelectorAll(".nexus-group-surface")]);
  for (const node of record.observed) if (!current.has(node)) { record.observer?.unobserve(node); record.observed.delete(node); }
  for (const node of current) if (!record.observed.has(node)) { record.observer?.observe(node); record.observed.add(node); }
  record.schedule();
}
