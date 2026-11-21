import { getTriggeredActions, getComponentInteractions } from "../core/interactions.js";

/** Play-mode events always resolve against the latest in-memory component data. */
export function activateCanvasPlayInteractions(sheet, html) {
  sheet._nexusPlayCleanup?.(); sheet._nexusPlayCleanup = null;
  const root = html?.[0], canvas = root?.querySelector?.(".nexus-canvas");
  if (!canvas) return;
  const modifiersOf = event => [event.shiftKey ? "shift" : null,event.ctrlKey ? "ctrl" : null,event.altKey ? "alt" : null,event.metaKey ? "meta" : null].filter(Boolean);
  const cardOf = event => { const target=event.target instanceof Element?event.target:event.target?.parentElement;const card=target?.closest?.(".nexus-component");return card&&canvas.contains(card)?card:null; };
  const isControlTarget = event => { const target=event.target instanceof Element?event.target:event.target?.parentElement;return !!target?.closest?.("input,textarea,select,button,a,[contenteditable='true']"); };
  // Um gesto primário pode emitir pointerDown e, em seguida, click.
  // O mesmo fluxo configurado para ambos deve executar uma única vez.
  const pointerDownFlows = new Map();
  const holdTimers = new Map();
  const clearHoldTimers = id => { for (const timer of holdTimers.get(id) ?? []) clearTimeout(timer); holdTimers.delete(id); };
  const dispatch = (event,name,extra={}) => {
    if(sheet._mode!=="play")return false;
    const card=cardOf(event);if(!card)return false;
    const component=sheet._currentLayout?.components?.find(item=>item.id===card.dataset.id),modifiers=modifiersOf(event);
    const context={actor:sheet.actor,modifiers,key:extra.key,skipInteractionIds:extra.skipInteractionIds};
    if(!getTriggeredActions(component,name,context).length)return false;
    sheet._runComponentAction(card.dataset.id,name,{...extra,modifiers});return true;
  };
  const stop=(event,name,extra)=>{if(!dispatch(event,name,extra))return false;event.preventDefault();event.stopPropagation();return true;};
  const hasKeyboardTrigger = component => getComponentInteractions(component).some(flow =>
    flow.enabled && flow.triggers.some(trigger => ["focus","blur"].includes(trigger.event) || (["keyDown","keyUp"].includes(trigger.event) && !!String(trigger.key ?? "").trim())) &&
    flow.actions.some(action => action.enabled)
  );
  const onKeydown=event=>{
    if(sheet._mode!=="play"||event.repeat||isControlTarget(event))return;
    if(dispatch(event,"keyDown",{key:event.key})){event.preventDefault();event.stopPropagation();return;}
    if(["Enter"," "].includes(event.key))stop(event,"click",{key:event.key,keyboard:true});
  };
  const onKeyup=event=>{
    if(isControlTarget(event))return;
    if(dispatch(event,"keyUp",{key:event.key})){event.preventDefault();event.stopPropagation();}
  };
  const onClick=event=>{
    if(event.button!==0||performance.now()<(sheet._suppressComponentClickUntil??0)||isControlTarget(event))return;
    const card=cardOf(event),pending=card&&pointerDownFlows.get(card.dataset.id);
    const skipInteractionIds=event.detail>0&&pending&&performance.now()-pending.time<1200?pending.ids:[];
    if(card)pointerDownFlows.delete(card.dataset.id);
    stop(event,"click",{skipInteractionIds});
  };
  const onDoubleClick=event=>{if(!isControlTarget(event))stop(event,"doubleClick");};
  const onContextMenu=event=>{if(!isControlTarget(event))stop(event,"rightClick");};
  const onAuxClick=event=>{if(event.button===1&&!isControlTarget(event))stop(event,"middleClick");};
  const pointerBehaviorEvents = new Set(["click","doubleClick","rightClick","middleClick","pointerDown","pointerUp","hold","interact"]);
  let cursorCard = null;
  const clearBehaviorCursor = () => { cursorCard?.style.removeProperty("cursor"); cursorCard = null; };
  const onPointerMove = event => {
    const movingCard=cardOf(event);for(const id of holdTimers.keys())if(id!==movingCard?.dataset.id)clearHoldTimers(id);if(movingCard){const pending=pointerDownFlows.get(movingCard.dataset.id);if(pending&&Math.hypot(event.clientX-pending.x,event.clientY-pending.y)>8)clearHoldTimers(movingCard.dataset.id);}
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
  const onPointerLeave = () => { for(const id of holdTimers.keys())clearHoldTimers(id); clearBehaviorCursor(); };
  const onPointerDown=event=>{
    if(isControlTarget(event))return;
    const card=cardOf(event);
    if(card&&event.button===0){
      clearHoldTimers(card.dataset.id);
      const component=sheet._currentLayout?.components?.find(item=>item.id===card.dataset.id);
      const actions=getTriggeredActions(component,"pointerDown",{actor:sheet.actor,modifiers:modifiersOf(event),key:""});
      if(actions.length)pointerDownFlows.set(card.dataset.id,{time:performance.now(),x:event.clientX,y:event.clientY,ids:[...new Set(actions.map(action=>action.interactionId))]});
      const holdTriggers=getComponentInteractions(component).filter(flow=>flow.enabled&&flow.actions.some(action=>action.enabled))
        .flatMap(flow=>flow.triggers.filter(trigger=>trigger.event==="hold").map(trigger=>({durationMs:trigger.durationMs??600})));
      const fired=new Set();
      const timers=holdTriggers.map(trigger=>setTimeout(()=>{
        const pending=getTriggeredActions(component,"hold",{actor:sheet.actor,modifiers:modifiersOf(event),durationMs:trigger.durationMs,skipInteractionIds:[...fired]});
        const ids=[...new Set(pending.map(action=>action.interactionId))];
        if(ids.length){sheet._runComponentAction(card.dataset.id,"hold",{modifiers:modifiersOf(event),durationMs:trigger.durationMs,skipInteractionIds:[...fired]});ids.forEach(id=>fired.add(id));}
      },trigger.durationMs));
      if(timers.length)holdTimers.set(card.dataset.id,timers);
    }
    dispatch(event,"pointerDown",{button:event.button,pointerType:event.pointerType});
    const component=card&&sheet._currentLayout?.components?.find(item=>item.id===card.dataset.id);
    if(card&&hasKeyboardTrigger(component))card.focus?.({preventScroll:true});
  };
  const onPointerUp=event=>{for(const id of holdTimers.keys())clearHoldTimers(id);if(!isControlTarget(event))dispatch(event,"pointerUp",{button:event.button,pointerType:event.pointerType});};
  const onPointerOver=event=>{const card=cardOf(event);if(card&&!(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget)))dispatch(event,"hover",{pointerType:event.pointerType});};
  const onFocusIn=event=>{const card=cardOf(event);if(card&&!(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget)))dispatch(event,"focus");};
  const onFocusOut=event=>{const card=cardOf(event);if(card&&!(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget)))dispatch(event,"blur");};
  const onChange=event=>dispatch(event,"change",{fieldName:event.target?.name??""});
  const onSubmit=event=>stop(event,"submit");
  const listeners=[["keydown",onKeydown],["keyup",onKeyup],["click",onClick],["dblclick",onDoubleClick],["contextmenu",onContextMenu],["auxclick",onAuxClick],["pointerdown",onPointerDown],["pointerup",onPointerUp],["pointermove",onPointerMove],["pointerover",onPointerOver],["focusin",onFocusIn],["focusout",onFocusOut],["change",onChange],["submit",onSubmit]];
  for(const [name,listener] of listeners)canvas.addEventListener(name,listener);
  canvas.addEventListener("pointerleave",onPointerLeave);
  sheet._nexusPlayCleanup=()=>{for(const [name,listener] of listeners)canvas.removeEventListener(name,listener);canvas.removeEventListener("pointerleave",onPointerLeave);pointerDownFlows.clear();for(const id of holdTimers.keys())clearHoldTimers(id);clearBehaviorCursor();};
}
