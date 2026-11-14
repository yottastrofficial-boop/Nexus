import { getTriggeredActions } from "../core/interactions.js";

/**
 * Small play-mode event controller. It is independent from the visual editor.
 */
export function activateCanvasPlayInteractions(sheet, html) {
  sheet._nexusPlayCleanup?.();
  sheet._nexusPlayCleanup = null;

  const root = html?.[0];
  const canvas = root?.querySelector?.(".nexus-canvas");
  if (!canvas) return;

  const onKeydown = event => {
    if (sheet._mode !== "play" || !["Enter", " "].includes(event.key)) return;
    if (event.target.closest("input,textarea,select,button,a,[contenteditable=\"true\"]")) return;
    const card = event.target.closest(".nexus-component[data-has-click-interaction=\"true\"]");
    if (!card) return;
    event.preventDefault();
    sheet._runComponentAction(card.dataset.id);
  };
  const onClick = event => {
    if (sheet._mode !== "play" || performance.now() < (sheet._suppressComponentClickUntil ?? 0)) return;
    const card = event.target instanceof Element ? event.target.closest(".nexus-component[data-has-click-interaction=\"true\"]") : null;
    if (!card || !canvas.contains(card) || event.target.closest("input,textarea,select,button,a,[contenteditable=\"true\"]")) return;
    event.preventDefault();
    sheet._runComponentAction(card.dataset.id, "click");
  };
  const onContextMenu = event => {
    if (sheet._mode !== "play") return;
    const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
    if (!card || !canvas.contains(card)) return;
    const component = sheet._currentLayout?.components?.find(item => item.id === card.dataset.id);
    if (!getTriggeredActions(component, "rightClick", { actor: sheet.actor }).length) return;
    event.preventDefault();
    event.stopPropagation();
    sheet._runComponentAction(card.dataset.id, "rightClick");
  };
  const onPointerOver = event => {
    if (sheet._mode !== "play" || (event.relatedTarget instanceof Node && event.target.closest(".nexus-component")?.contains(event.relatedTarget))) return;
    const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
    if (card && canvas.contains(card)) sheet._runComponentAction(card.dataset.id, "hover");
  };
  const onChange = event => {
    if (sheet._mode !== "play") return;
    const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
    if (card) sheet._runComponentAction(card.dataset.id, "change", { fieldName: event.target.name ?? "" });
  };
  const onSubmit = event => {
    if (sheet._mode !== "play") return;
    const card = event.target instanceof Element ? event.target.closest(".nexus-component") : null;
    if (card) sheet._runComponentAction(card.dataset.id, "submit");
  };

  canvas.addEventListener("keydown", onKeydown);
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("pointerover", onPointerOver);
  canvas.addEventListener("change", onChange);
  canvas.addEventListener("submit", onSubmit);

  sheet._nexusPlayCleanup = () => {
    canvas.removeEventListener("keydown", onKeydown);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("pointerover", onPointerOver);
    canvas.removeEventListener("change", onChange);
    canvas.removeEventListener("submit", onSubmit);
  };
}
