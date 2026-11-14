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
