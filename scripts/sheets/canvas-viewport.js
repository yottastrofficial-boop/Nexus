/**
 * Lightweight Canvas sizing for every sheet mode.
 * The editor controller is loaded only when appearance mode is opened.
 */
export function activateCanvasViewport(sheet, html) {
  sheet._nexusViewportCleanup?.();
  sheet._nexusViewportCleanup = null;

  const root = html?.[0];
  const canvas = root?.querySelector?.(".nexus-canvas");
  const stage = root?.querySelector?.(".nexus-canvas-stage");
  if (!canvas || !stage) return;

  const fitCanvas = () => {
    if (!stage.isConnected || !canvas.isConnected) return;
    const width = Number(canvas.dataset.layoutWidth) || 800;
    const height = Number(canvas.dataset.layoutHeight) || 800;
    const scaleX = Math.max(1, stage.clientWidth - 24) / width;
    const scaleY = Math.max(1, stage.clientHeight - 24) / height;
    const scale = Math.max(0.25, Math.min(1.5, Math.min(scaleX, scaleY)));
    canvas.style.zoom = String(Number(scale.toFixed(4)));
  };

  sheet._fitNexusCanvas = fitCanvas;
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitCanvas) : null;
  observer?.observe(stage);
  const frame = requestAnimationFrame(fitCanvas);

  sheet._nexusViewportCleanup = () => {
    observer?.disconnect();
    cancelAnimationFrame(frame);
    if (sheet._fitNexusCanvas === fitCanvas) sheet._fitNexusCanvas = null;
  };
}
