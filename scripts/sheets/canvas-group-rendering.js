import { updateCanvasConnectedCorners, observeCanvasConnectedCorners } from "./canvas-connected-corners.js";

/**
 * Shared visual rendering for Canvas groups.
 *
 * Group surfaces are structural UI, not editor-only decoration. They must be
 * present in Default, Configuration and Appearance modes so grouped components
 * keep the same shared surface outside the visual editor.
 */
const readDimension = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getElementRect = element => ({
  x: readDimension(element.style.left),
  y: readDimension(element.style.top),
  w: readDimension(element.style.width, element.offsetWidth),
  h: readDimension(element.style.height, element.offsetHeight)
});

export function renderCanvasGroups(sheet, root) {
  const canvas = root?.querySelector?.(".nexus-canvas");
  if (!canvas) return { rendered: 0, groups: [] };

  const components = [...canvas.querySelectorAll(".nexus-component")];

  // Unwrap old group containers before rebuilding. Component nodes are reused,
  // preserving their listeners and current form state.
  for (const container of [...canvas.querySelectorAll(".nexus-group-container")]) {
    for (const component of [...container.querySelectorAll(".nexus-component")]) {
      canvas.append(component);
    }
    container.remove();
  }
  canvas.querySelectorAll(".nexus-group-surface").forEach(surface => surface.remove());

  for (const component of components) {
    delete component.dataset.groupId;
    component.classList.remove("is-group-member", "is-group-inspecting");
    component.style.removeProperty("--nexus-group-bg");
    component.style.removeProperty("--nexus-group-border");
    component.style.removeProperty("--nexus-group-radius");
  }

  const groups = Array.isArray(sheet?._currentLayout?.groups) ? sheet._currentLayout.groups : [];
  sheet._activeGroups = groups;
  const componentById = new Map(components.map(component => [component.dataset.id, component]));
  let rendered = 0;

  for (const group of groups) {
    const memberIds = [...new Set(Array.isArray(group?.componentIds) ? group.componentIds : [])];
    const members = memberIds.map(id => componentById.get(id)).filter(component => component && !component.hidden);
    if (!members.length) continue;

    const rects = members.map(getElementRect);
    const x = Math.min(...rects.map(rect => rect.x));
    const y = Math.min(...rects.map(rect => rect.y));
    const right = Math.max(...rects.map(rect => rect.x + rect.w));
    const bottom = Math.max(...rects.map(rect => rect.y + rect.h));
    group.x = x;
    group.y = y;
    group.w = right - x;
    group.h = bottom - y;

    const container = document.createElement("div");
    container.className = "nexus-group-container";
    container.dataset.groupContainer = String(group.id ?? "");

    const surface = document.createElement("div");
    surface.className = "nexus-group-surface";
    if (group.hidden) surface.classList.add("is-layer-hidden");
    if (group.locked) surface.classList.add("is-locked");
    if (sheet._mode !== "appearance") surface.classList.add("is-static");
    surface.dataset.groupId = String(group.id ?? "");
    surface.hidden = !!group.hidden;

    const baseZ = Math.min(...members.map(element => readDimension(element.style.zIndex, 1)));
    Object.assign(surface.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${right - x}px`,
      height: `${bottom - y}px`,
      zIndex: String(Math.max(0, baseZ - 1))
    });
    const radius = Number(group.borderRadius ?? 8);
    const safeRadius = Number.isFinite(radius) ? Math.min(32, Math.max(0, radius)) : 8;
    surface.style.setProperty("--nexus-group-bg", group.backgroundColor ?? sheet._currentLayout?.cardColor ?? "#273443");
    surface.style.setProperty("--nexus-group-border", group.borderColor ?? "#52647b");
    surface.style.setProperty("--nexus-group-radius", `${safeRadius}px`);

    container.append(surface);
    for (const component of members) {
      component.dataset.groupId = String(group.id ?? "");
      component.classList.add("is-group-member");
      container.append(component);
    }
    canvas.insertBefore(container, canvas.firstChild);
    rendered += 1;
  }

  updateCanvasConnectedCorners(canvas);
  observeCanvasConnectedCorners(canvas);
  return { rendered, groups };
}
