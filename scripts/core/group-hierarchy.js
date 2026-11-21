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
    const id = String(group.id);
    const parentId = String(group.parentGroupId ?? "");
    parentById.set(id, parentId && parentId !== id && groupById.has(parentId) ? parentId : "");
  }

  // Detect and break corrupt cycles iteratively to avoid call-stack growth on deep trees.
  const processed = new Set();
  for (const group of validGroups) {
    const startId = String(group.id);
    if (processed.has(startId)) continue;
    const path = [];
    const indexById = new Map();
    let cursor = startId;

    while (cursor && groupById.has(cursor) && !processed.has(cursor) && !indexById.has(cursor)) {
      indexById.set(cursor, path.length);
      path.push(cursor);
      cursor = parentById.get(cursor) ?? "";
    }

    if (cursor && indexById.has(cursor)) {
      // Root the first node in the detected cycle while preserving its descendants.
      parentById.set(path[indexById.get(cursor)], "");
    }
    for (const id of path) processed.add(id);
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
    const id = String(group.id);
    const parentId = parentById.get(id);
    if (parentId) children.get(parentId)?.push(id);
  }

  const roots = validGroups.filter(group => !parentById.get(String(group.id))).map(group => String(group.id));
  const postorder = [];
  const traversal = roots.slice().reverse().map(id => ({ id, expanded: false }));
  while (traversal.length) {
    const entry = traversal.pop();
    if (entry.expanded) {
      postorder.push(entry.id);
      continue;
    }
    traversal.push({ id: entry.id, expanded: true });
    const childIds = children.get(entry.id) ?? [];
    for (let index = childIds.length - 1; index >= 0; index--) {
      traversal.push({ id: childIds[index], expanded: false });
    }
  }

  const descendants = new Map();
  for (const id of postorder) {
    const ids = [];
    const seen = new Set();
    for (const componentId of directComponents.get(id) ?? []) {
      if (seen.has(componentId)) continue;
      seen.add(componentId);
      ids.push(componentId);
    }
    for (const childId of children.get(id) ?? []) {
      for (const componentId of descendants.get(childId) ?? []) {
        if (seen.has(componentId)) continue;
        seen.add(componentId);
        ids.push(componentId);
      }
    }
    descendants.set(id, ids);
  }

  const rows = [];
  const depthById = new Map();
  const flattenStack = roots.slice().reverse().map(id => ({ id, depth: 0 }));
  while (flattenStack.length) {
    const { id, depth } = flattenStack.pop();
    const group = groupById.get(id);
    if (!group) continue;
    depthById.set(id, depth);
    rows.push({
      id, kind: "group", depth, group,
      componentIds: descendants.get(id) ?? [],
      directComponentIds: directComponents.get(id) ?? [],
      children: children.get(id) ?? []
    });
    for (const componentId of directComponents.get(id) ?? []) {
      rows.push({ id: componentId, kind: "component", depth: depth + 1 });
    }
    const childIds = children.get(id) ?? [];
    for (let index = childIds.length - 1; index >= 0; index--) {
      flattenStack.push({ id: childIds[index], depth: depth + 1 });
    }
  }

  for (const component of components ?? []) {
    const id = String(component.id);
    if (!componentOwner.has(id)) rows.push({ id, kind: "component", depth: 0 });
  }

  return { groupById, parentById, directComponents, children, descendants, roots, rows, componentOwner, depthById };
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
