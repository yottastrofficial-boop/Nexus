const cloneValue = value => value === undefined ? undefined : structuredClone(value);
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const mergeIdentifiedArray = (base, desired, latest, path) => {
  const byId = values => new Map(values.filter(item => item && typeof item.id === "string").map(item => [item.id, item]));
  const baseMap = byId(base), desiredMap = byId(desired), latestMap = byId(latest);
  const ids = [...new Set([...latest.map(item => item?.id), ...desired.map(item => item?.id), ...base.map(item => item?.id)].filter(id => typeof id === "string"))];
  const merged = [];
  for (const id of ids) {
    const b = baseMap.get(id), d = desiredMap.get(id), l = latestMap.get(id);
    if (b && !d) {
      if (l && !sameValue(l, b)) merged.push(cloneValue(l));
      continue;
    }
    if (!b && d) {
      merged.push(cloneValue(d));
      continue;
    }
    if (b && d && !l) {
      if (!sameValue(d, b)) merged.push(cloneValue(d));
      continue;
    }
    if (d && l) merged.push(mergeNode(b, d, l, path));
    else if (l) merged.push(cloneValue(l));
    else if (d) merged.push(cloneValue(d));
  }
  return merged;
};

const mergeNode = (base, desired, latest, path = "") => {
  if (sameValue(desired, base)) return cloneValue(latest);
  if (sameValue(latest, base)) return cloneValue(desired);

  if (Array.isArray(base) && Array.isArray(desired) && Array.isArray(latest)) {
    const key = path.split(".").at(-1);
    if (["components", "groups", "links"].includes(key)) {
      return mergeIdentifiedArray(base, desired, latest, path);
    }
    return cloneValue(desired);
  }

  if (isRecord(base) && isRecord(desired) && isRecord(latest)) {
    const result = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(desired), ...Object.keys(latest)]);
    for (const key of keys) {
      const b = Object.hasOwn(base, key), d = Object.hasOwn(desired, key), l = Object.hasOwn(latest, key);
      if (!d) {
        if (!b && l) result[key] = cloneValue(latest[key]);
        else if (b && l && !sameValue(latest[key], base[key])) result[key] = cloneValue(latest[key]);
      } else if (!b) {
        result[key] = cloneValue(desired[key]);
      } else if (!l) {
        if (!sameValue(desired[key], base[key])) result[key] = cloneValue(desired[key]);
      } else {
        result[key] = mergeNode(base[key], desired[key], latest[key], path ? `${path}.${key}` : key);
      }
    }
    return result;
  }

  return cloneValue(desired);
};

/**
 * Three-way merge for concurrently edited layout snapshots.
 * Changes on separate component IDs/properties are preserved; same-field
 * conflicts use the most recent submitted edit.
 */
export function mergeLayoutSnapshots(base, desired, latest) {
  return mergeNode(base, desired, latest);
}
