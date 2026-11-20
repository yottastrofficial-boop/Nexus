/**
 * Canonical hierarchy helpers for Canvas groups.
 * Groups own direct componentIds and may contain child groups through parentGroupId.
 */
export function buildGroupHierarchy(groups = [], components = []) {
  const validGroups = Array.isArray(groups) ? groups.filter(group => group && group.id) : [];
  const groupById = new Map(validGroups.map(group => [String(group.id), group]));
  const componentIds = new Set((components ?? []).map(component => String(component.id)));
  const parentById = new Map();
  for (const group of validGroups) {
    const parentId = String(group.parentGroupId ?? "");
    parentById.set(String(group.id), parentId && parentId !== String(group.id) && groupById.has(parentId) ? parentId : "");
  }
  // Break corrupt cycles deterministically, preserving the first valid ancestor chain.
  for (const group of validGroups) {
    const id = String(group.id);
    const seen = new Set([id]);
    let parentId = parentById.get(id);
    while (parentId) {
      if (seen.has(parentId)) {
        parentById.set(id, "");
        break;
      }
      seen.add(parentId);
      parentId = parentById.get(parentId) ?? "";
    }
  }
  const directComponents = new Map(validGroups.map(group => [String(group.id), []]));
  const componentOwner = new Map();
  for (const group of validGroups) {
    const id = String(group.id);
    for (const componentId of [...new Set(group.componentIds ?? [])].map(String)) {
      if (!componentIds.has(componentId) || componentOwner.has(componentId)) continue;
      componentOwner.set(componentId, id);
      directComponents.get(id).push(componentId);
    }
  }
  const children = new Map(validGroups.map(group => [String(group.id), []]));
  for (const group of validGroups) {
    const id = String(group.id), parentId = parentById.get(id);
    if (parentId) children.get(parentId)?.push(id);
  }
  const descendants = new Map();
  const collect = (id, stack = new Set()) => {
    if (descendants.has(id)) return descendants.get(id);
    if (stack.has(id)) return [];
    const nextStack = new Set(stack).add(id);
    const ids = [...(directComponents.get(id) ?? [])];
    for (const childId of children.get(id) ?? []) ids.push(...collect(childId, nextStack));
    const unique = [...new Set(ids)];
    descendants.set(id, unique);
    return unique;
  };
  for (const group of validGroups) collect(String(group.id));
  const roots = validGroups.filter(group => !parentById.get(String(group.id))).map(group => String(group.id));
  const flatten = (id, depth = 0, ancestors = new Set()) => {
    if (ancestors.has(id)) return [];
    const group = groupById.get(id);
    if (!group) return [];
    const next = new Set(ancestors).add(id);
    const rows = [{
      id, kind: "group", depth, group,
      componentIds: descendants.get(id) ?? [],
      directComponentIds: directComponents.get(id) ?? [],
      children: children.get(id) ?? []
    }];
    for (const componentId of directComponents.get(id) ?? []) rows.push({ id: componentId, kind: "component", depth: depth + 1 });
    for (const childId of children.get(id) ?? []) rows.push(...flatten(childId, depth + 1, next));
    return rows;
  };
  const rows = [];
  for (const rootId of roots) rows.push(...flatten(rootId));
  for (const component of components ?? []) {
    const id = String(component.id);
    if (!componentOwner.has(id)) rows.push({ id, kind: "component", depth: 0 });
  }
  return { groupById, parentById, directComponents, children, descendants, roots, rows, componentOwner };
}

export function getGroupDescendantComponentIds(groupId, hierarchy) {
  return [...(hierarchy?.descendants?.get(String(groupId)) ?? [])];
}

export function validateGroupParent(groups = [], groupId, parentGroupId = "") {
  const id = String(groupId ?? ""), parent = String(parentGroupId ?? "");
  if (!id || id === parent) return false;
  const map = new Map((groups ?? []).map(group => [String(group.id), group]));
  if (parent && !map.has(parent)) return false;
  let cursor = parent, visited = new Set();
  while (cursor) {
    if (cursor === id || visited.has(cursor)) return false;
    visited.add(cursor);
    cursor = String(map.get(cursor)?.parentGroupId ?? "");
  }
  return true;
}

export function getGroupTreeSnapshot(groupId, groups = [], components = []) {
  const hierarchy = buildGroupHierarchy(groups, components);
  const group = hierarchy.groupById.get(String(groupId));
  if (!group) return null;
  const componentMap = new Map((components ?? []).map(component => [String(component.id), component]));
  const collect = id => {
    const current = hierarchy.groupById.get(String(id));
    if (!current) return null;
    return {
      ...Object.fromEntries(Object.entries(current).filter(([key]) => !["id", "parentGroupId", "componentIds", "x", "y", "w", "h", "z", "stackOrder"].includes(key))),
      componentIds: [...(hierarchy.directComponents.get(String(id)) ?? [])].map(componentId => {
        const component = componentMap.get(componentId);
        if (!component) return null;
        const { id: _id, definition: _definition, ...data } = structuredClone(component);
        return { sourceId: componentId, ...data };
      }).filter(Boolean),
      groups: (hierarchy.children.get(String(id)) ?? []).map(collect).filter(Boolean)
    };
  };
  return collect(String(groupId));
}
