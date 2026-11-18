/**
 * Lightweight Canvas sizing for every sheet mode.
 * The editor controller is loaded only when appearance mode is opened.
 */
import { applyThemeTokens } from "../core/theme.js";

export function activateCanvasViewport(sheet, html) {
  sheet._nexusViewportCleanup?.();
  sheet._nexusViewportCleanup = null;

  const root = html?.[0];
  const canvas = root?.querySelector?.(".nexus-canvas");
  const stage = root?.querySelector?.(".nexus-canvas-stage");
  if (!canvas || !stage) return;

  const layout = sheet._currentLayout ?? {};
  applyThemeTokens(root.querySelector(".nexus-sheet"), layout);
  canvas.style.setProperty("--nexus-font-size", `${layout.fontSize ?? 13}px`);
  canvas.style.setProperty("--nexus-secondary-font-size", `${layout.secondaryFontSize ?? 11}px`);
  canvas.style.setProperty("--nexus-value-font-size", `${layout.valueFontSize ?? 20}px`);
  canvas.style.setProperty("--nexus-canvas-color", layout.canvasColor ?? "#171f2a");
  canvas.style.setProperty("--nexus-card-color", layout.cardColor ?? "#273443");
  canvas.style.setProperty("--nexus-accent-color", layout.accentColor ?? "#52647b");
  canvas.style.setProperty("--nexus-highlight-color", layout.highlightColor ?? "#78b7e8");
  canvas.style.setProperty("--nexus-button-color", layout.buttonColor ?? "#315b7d");
  applyThemeTokens(canvas, layout);
  const appWindow = root.closest(".application, .window-app");
  appWindow?.style.setProperty("--nexus-font-family", `"${layout.fontFamily ?? "Inter"}", sans-serif`);
  appWindow?.style.setProperty("--nexus-highlight-color", layout.highlightColor ?? "#78b7e8");
  appWindow?.style.setProperty("--nexus-button-color", layout.buttonColor ?? "#315b7d");

  let pendingFrame = 0;
  let lastScale = null;
  const fitCanvas = () => {
    if (!stage.isConnected || !canvas.isConnected) return;
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (stageWidth <= 0 || stageHeight <= 0) return;

    const width = Number(canvas.dataset.layoutWidth) || 800;
    const height = Number(canvas.dataset.layoutHeight) || 800;
    const scaleX = Math.max(1, stageWidth - 24) / width;
    const scaleY = Math.max(1, stageHeight - 24) / height;
    const scale = Number(Math.max(0.25, Math.min(1.5, Math.min(scaleX, scaleY))).toFixed(4));

    // Evita escrita de estilo e invalidação de layout quando o zoom não mudou.
    if (scale === lastScale) return;
    canvas.style.zoom = String(scale);
    lastScale = scale;
  };
  const scheduleFitCanvas = () => {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      fitCanvas();
    });
  };

  sheet._fitNexusCanvas = scheduleFitCanvas;
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleFitCanvas) : null;
  observer?.observe(stage);
  scheduleFitCanvas();

  sheet._nexusViewportCleanup = () => {
    observer?.disconnect();
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    if (sheet._fitNexusCanvas === scheduleFitCanvas) sheet._fitNexusCanvas = null;
  };
}
