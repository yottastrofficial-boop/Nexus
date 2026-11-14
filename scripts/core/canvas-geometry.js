/**
 * Geometry helpers shared by Canvas alignment and regression tests.
 * These functions operate on plain rectangles and have no Foundry dependencies.
 */
export const getAxisAnchors = (rect, axis) => axis === "x"
  ? [rect.x, rect.x + rect.w / 2, rect.x + rect.w]
  : [rect.y, rect.y + rect.h / 2, rect.y + rect.h];

export function findBestAlignmentMatch(sources, targets, axis, tolerance = 7) {
  if (!sources?.length || !targets?.length) return null;
  const targetAnchors = [];
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
    const target = targets[targetIndex], values = getAxisAnchors(target, axis);
    for (let anchorIndex = 0; anchorIndex < values.length; anchorIndex++) {
      targetAnchors.push({ value: values[anchorIndex], target, order: targetIndex * 3 + anchorIndex });
    }
  }
  targetAnchors.sort((a, b) => a.value - b.value || a.order - b.order);
  const lowerBound = value => {
    let low = 0, high = targetAnchors.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (targetAnchors[middle].value < value) low = middle + 1;
      else high = middle;
    }
    return low;
  };

  let best = null, bestDistance = Infinity;
  for (const source of sources) {
    for (const own of getAxisAnchors(source, axis)) {
      const insertion = lowerBound(own), left = targetAnchors[insertion - 1], right = targetAnchors[insertion];
      const leftDistance = left ? Math.abs(left.value - own) : Infinity;
      const rightDistance = right ? Math.abs(right.value - own) : Infinity;
      const nearestDistance = Math.min(leftDistance, rightDistance);
      if (nearestDistance > tolerance || nearestDistance >= bestDistance) continue;

      let nearest = null;
      const nearestValues = [];
      if (left && leftDistance === nearestDistance) nearestValues.push(left.value);
      if (right && rightDistance === nearestDistance && right.value !== left?.value) nearestValues.push(right.value);
      for (const value of nearestValues) {
        const first = targetAnchors[lowerBound(value)];
        if (first && (!nearest || first.order < nearest.order)) nearest = first;
      }
      if (!nearest) continue;

      const target = nearest.target, delta = nearest.value - own;
      const gapX = Math.max(0, target.x - (source.x + source.w), source.x - (target.x + target.w));
      const gapY = Math.max(0, target.y - (source.y + source.h), source.y - (target.y + target.h));
      const labelY = source.y + source.h <= target.y
        ? (source.y + source.h + target.y) / 2
        : target.y + target.h <= source.y
          ? (target.y + target.h + source.y) / 2
          : (Math.max(source.y, target.y) + Math.min(source.y + source.h, target.y + target.h)) / 2;
      const labelX = source.x + source.w <= target.x
        ? (source.x + source.w + target.x) / 2
        : target.x + target.w <= source.x
          ? (target.x + target.w + source.x) / 2
          : (Math.max(source.x, target.x) + Math.min(source.x + source.w, target.x + target.w)) / 2;
      best = { delta, pos: nearest.value, distance: axis === "x" ? gapY : gapX, labelAt: axis === "x" ? labelY : labelX };
      bestDistance = nearestDistance;
    }
  }
  return best;
}
