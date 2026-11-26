/** Fits the fixed-size sheet Canvas inside its viewport without clipping it. */
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const px = value => { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? parsed : 0; };

export function computeCanvasFitScale({ viewportWidth, viewportHeight, canvasWidth, canvasHeight, minScale = 0.25 } = {}) {
  const vw = finite(viewportWidth, 0), vh = finite(viewportHeight, 0);
  const cw = finite(canvasWidth, 0), ch = finite(canvasHeight, 0);
  if (vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) return 1;
  const scale = Math.min(1, vw / cw, vh / ch);
  return Math.max(minScale, Math.round(scale * 1000) / 1000);
}

/**
 * Keeps `--nexus-fit-scale` on the Canvas in sync with the scroll viewport.
 * Only play/config modes are scaled: appearance mode edits in canvas pixels.
 * Returns a cleanup function that disconnects every observer.
 */
export function installCanvasFit(root) {
  const scroller = root?.querySelector?.(".nexus-canvas-scroll");
  const canvas = root?.querySelector?.(".nexus-canvas");
  if (!scroller || !canvas) return () => {};
  const apply = () => {
    if (!canvas.isConnected) return;
    let scale = 1;
    if (root.dataset?.mode !== "appearance") {
      const style = globalThis.getComputedStyle?.(scroller);
      const padX = px(style?.paddingLeft) + px(style?.paddingRight);
      const padY = px(style?.paddingTop) + px(style?.paddingBottom);
      scale = computeCanvasFitScale({
        viewportWidth: scroller.clientWidth - padX,
        viewportHeight: scroller.clientHeight - padY,
        canvasWidth: canvas.dataset.layoutWidth,
        canvasHeight: canvas.dataset.layoutHeight
      });
    }
    canvas.style.setProperty("--nexus-fit-scale", String(scale));
  };
  const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
  resizeObserver?.observe(scroller);
  const modeObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(apply) : null;
  modeObserver?.observe(root, { attributes: true, attributeFilter: ["data-mode"] });
  apply();
  return () => { resizeObserver?.disconnect(); modeObserver?.disconnect(); };
}
