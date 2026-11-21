import { updateCanvasConnectedCorners, observeCanvasConnectedCorners } from "./canvas-connected-corners.js";
import { buildGroupHierarchy } from "../core/group-hierarchy.js";

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

/**
 * Draws independent group surfaces. Components remain direct Canvas children:
 * nested groups therefore never reparent, resize, or consume layout spacing.
 */
export function renderCanvasGroups(sheet, root) {
  const canvas = root?.querySelector?.(".nexus-canvas");
  if (!canvas) return { rendered: 0, groups: [] };
  canvas.querySelectorAll(".nexus-group-surface").forEach(surface => surface.remove());
  const components = [...canvas.querySelectorAll(".nexus-component")];
  const groups = Array.isArray(sheet?._currentLayout?.groups) ? sheet._currentLayout.groups : [];
  sheet._activeGroups = groups;
  const hierarchy = buildGroupHierarchy(groups, components.map(element => ({ id: element.dataset.id })));
  for (const component of components) {
    component.classList.remove("is-group-member", "is-group-inspecting");
    delete component.dataset.groupId;
    component.style.removeProperty("--nexus-group-bg");
    component.style.removeProperty("--nexus-group-border");
    component.style.removeProperty("--nexus-group-radius");
    const ownerId = hierarchy.componentOwner.get(String(component.dataset.id));
    const owner = ownerId ? hierarchy.groupById.get(ownerId) : null;
    if (!owner) continue;
    component.dataset.groupId = ownerId;
    component.classList.add("is-group-member");
    if((owner.kind??"container")!=="folder")component.style.setProperty("--nexus-group-bg",owner.backgroundColor??sheet._currentLayout?.cardColor??"#273443");
    component.style.setProperty("--nexus-group-border", owner.borderColor ?? "#52647b");
    component.style.setProperty("--nexus-group-radius", `${Math.min(32,Math.max(0,Number(owner.borderRadius??8)||0))}px`);
  }
  sheet._groupHierarchy = hierarchy;
  const elementById = new Map(components.map(element => [String(element.dataset.id), element]));
  // Reuse the canonical depth index built by buildGroupHierarchy. Walking
  // parent chains here for every group made deep layouts quadratic and the
  // spread-based Math.max could exceed the argument limit on large layouts.
  const depthOf = id => hierarchy.depthById.get(String(id)) ?? 0;
  const maxDepth = groups.reduce((max, group) => Math.max(max, depthOf(group.id)), 0);
  const ordered = [...groups].sort((a, b) => depthOf(a.id) - depthOf(b.id));
  const surfaces = new Map();
  for (const group of ordered) {
    const ids = hierarchy.descendants.get(String(group.id)) ?? [];
    const members = ids.map(id => elementById.get(String(id))).filter(element => element && !element.hidden);
    if (!members.length) continue;
    const rects = members.map(getElementRect);
    const x = Math.min(...rects.map(rect => rect.x));
    const y = Math.min(...rects.map(rect => rect.y));
    const right = Math.max(...rects.map(rect => rect.x + rect.w));
    const bottom = Math.max(...rects.map(rect => rect.y + rect.h));
    Object.assign(group, { x, y, w: right - x, h: bottom - y });
    const surface = document.createElement("div");
    surface.className = "nexus-group-surface";
    surface.classList.add("is-" + (["folder","container","section"].includes(group.kind) ? group.kind : "container"));
    if (group.hidden) surface.classList.add("is-layer-hidden");
    if (group.locked) surface.classList.add("is-locked");
    if (sheet._mode !== "appearance") surface.classList.add("is-static");
    surface.dataset.groupId = String(group.id);
    surface.dataset.groupDepth = String(depthOf(group.id));
    if (depthOf(group.id) > 0) surface.classList.add("is-nested");
    surface.style.setProperty("--nexus-group-outline-offset", `${(maxDepth-depthOf(group.id))*2}px`);
    surface.setAttribute("aria-hidden", "true");
    surface.hidden = !!group.hidden;
    const baseZ = Math.min(...members.map(element => readDimension(element.style.zIndex, 1)));
    Object.assign(surface.style, {
      left: `${x}px`, top: `${y}px`, width: `${right - x}px`, height: `${bottom - y}px`,
      zIndex: String(Math.max(0, baseZ - 1))
    });
    const radius = Number(group.borderRadius ?? 8);
    const safeRadius = Number.isFinite(radius) ? Math.min(32, Math.max(0, radius)) : 8;
    surface.style.setProperty("--nexus-group-bg", group.backgroundColor ?? sheet._currentLayout?.cardColor ?? "#273443");
    surface.style.setProperty("--nexus-group-border", group.borderColor ?? "#52647b");
    surface.style.setProperty("--nexus-group-radius", `${safeRadius}px`);
    if(group.kind==="section"||group.showHeader===true){const heading=document.createElement("div");heading.className="nexus-group-heading";const title=document.createElement("span");title.textContent=String(group.title??group.name??"Grupo").slice(0,48);heading.append(title);surface.append(heading);}
    canvas.append(surface);
    surfaces.set(String(group.id), surface);
  }
  sheet._groupSurfaces = surfaces;
  updateCanvasConnectedCorners(canvas);
  observeCanvasConnectedCorners(canvas);
  return { rendered: surfaces.size, groups };
}
