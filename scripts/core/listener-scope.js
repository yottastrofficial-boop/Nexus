/**
 * Owns event listeners for one render/activation lifecycle.
 * Calling abort() removes every listener registered through listen().
 */
export function createListenerScope() {
  const controller = new AbortController();
  let aborted = false;

  const listen = (target, type, handler, options = undefined) => {
    if (aborted || !target?.addEventListener) return false;
    const normalized = typeof options === "boolean" ? { capture: options } : { ...(options ?? {}) };
    target.addEventListener(type, handler, { ...normalized, signal: controller.signal });
    return true;
  };

  return Object.freeze({
    listen,
    abort() {
      if (aborted) return;
      aborted = true;
      controller.abort();
    },
    get aborted() {
      return aborted;
    }
  });
}
