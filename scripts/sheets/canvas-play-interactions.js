import { getTriggeredActions, getComponentInteractions } from "../core/interactions.js";

/** Play-mode events always resolve against the latest in-memory component data. */
export function activateCanvasPlayInteractions(sheet, html) {
  sheet._nexusPlayCleanup?.(); sheet._nexusPlayCleanup = null;
  const root = html?.[0], canvas = root?.querySelector?.(".nexus-canvas");
  if (!canvas) return;
  const modifiersOf = event => [event.shiftKey ? "shift" : null,event.ctrlKey ? "ctrl" : null,event.altKey ? "alt" : null,event.metaKey ? "meta" : null].filter(Boolean);
  const cardOf = event => { const target=event.target instanceof Element?event.target:event.target?.parentElement;const card=target?.closest?.(".nexus-component");return card&&canvas.contains(card)?card:null; };
  const isControlTarget = event => { const target=event.target instanceof Element?event.target:event.target?.parentElement;return !!target?.closest?.("input,textarea,select,button,a,[contenteditable='true']"); };
  const dispatch = (event,name,extra={}) => {
    if(sheet._mode!=="play")return false;
    const card=cardOf(event);if(!card)return false;
    const component=sheet._currentLayout?.components?.find(item=>item.id===card.dataset.id),modifiers=modifiersOf(event);
    if(!getTriggeredActions(component,name,{actor:sheet.actor,modifiers,key:extra.key}).length)return false;
    sheet._runComponentAction(card.dataset.id,name,{...extra,modifiers});return true;
  };
  const stop=(event,name,extra)=>{if(!dispatch(event,name,extra))return false;event.preventDefault();event.stopPropagation();return true;};
  const onKeydown=event=>{if(sheet._mode!=="play"||isControlTarget(event))return;dispatch(event,"keyDown",{key:event.key});if(["Enter"," "].includes(event.key))stop(event,"click",{key:event.key,keyboard:true});};
  const onKeyup=event=>{if(!isControlTarget(event))dispatch(event,"keyUp",{key:event.key});};
  const onClick=event=>{if(event.button===0&&performance.now()>=(sheet._suppressComponentClickUntil??0)&&!isControlTarget(event))stop(event,"click");};
  const onDoubleClick=event=>{if(!isControlTarget(event))stop(event,"doubleClick");};
  const onContextMenu=event=>{if(!isControlTarget(event))stop(event,"rightClick");};
  const onAuxClick=event=>{if(event.button===1&&!isControlTarget(event))stop(event,"middleClick");};
  const pointerBehaviorEvents = new Set(["click","doubleClick","rightClick","middleClick","pointerDown","pointerUp","interact"]);
  let cursorCard = null;
  const clearBehaviorCursor = () => { cursorCard?.style.removeProperty("cursor"); cursorCard = null; };
  const onPointerMove = event => {
    if (sheet._mode !== "play") { clearBehaviorCursor(); return; }
    const card = cardOf(event);
    if (cursorCard && cursorCard !== card) clearBehaviorCursor();
    if (!card) return;
    const component = sheet._currentLayout?.components?.find(item => item.id === card.dataset.id);
    const actionable = getComponentInteractions(component).some(flow =>
      flow.enabled && flow.triggers.some(trigger => pointerBehaviorEvents.has(trigger.event)) &&
      flow.actions.some(action => action.enabled)
    );
    if (actionable) { card.style.setProperty("cursor", "pointer", "important"); cursorCard = card; }
    else if (cursorCard === card) clearBehaviorCursor();
  };
  const onPointerLeave = clearBehaviorCursor;
  const onPointerDown=event=>{if(!isControlTarget(event))dispatch(event,"pointerDown",{button:event.button,pointerType:event.pointerType});};
  const onPointerUp=event=>{if(!isControlTarget(event))dispatch(event,"pointerUp",{button:event.button,pointerType:event.pointerType});};
  const onPointerOver=event=>{const card=cardOf(event);if(card&&!(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget)))dispatch(event,"hover",{pointerType:event.pointerType});};
  const onFocusIn=event=>{const card=cardOf(event);if(card&&!(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget)))dispatch(event,"focus");};
  const onFocusOut=event=>{const card=cardOf(event);if(card&&!(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget)))dispatch(event,"blur");};
  const onChange=event=>dispatch(event,"change",{fieldName:event.target?.name??""});
  const onSubmit=event=>stop(event,"submit");
  const listeners=[["keydown",onKeydown],["keyup",onKeyup],["click",onClick],["dblclick",onDoubleClick],["contextmenu",onContextMenu],["auxclick",onAuxClick],["pointerdown",onPointerDown],["pointerup",onPointerUp],["pointermove",onPointerMove],["pointerover",onPointerOver],["focusin",onFocusIn],["focusout",onFocusOut],["change",onChange],["submit",onSubmit]];
  for(const [name,listener] of listeners)canvas.addEventListener(name,listener);
  canvas.addEventListener("pointerleave",onPointerLeave);
  sheet._nexusPlayCleanup=()=>{for(const [name,listener] of listeners)canvas.removeEventListener(name,listener);canvas.removeEventListener("pointerleave",onPointerLeave);clearBehaviorCursor();};
}
