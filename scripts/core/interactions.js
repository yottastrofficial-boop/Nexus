/**
 * Interaction Engine do NEXUS: fluxos com múltiplos Triggers, condições e Actions.
 * O motor não avalia JavaScript arbitrário.
 */
export const INTERACTION_EVENTS = Object.freeze(["click","doubleClick","rightClick","middleClick","pointerDown","pointerUp","hold","hover","change","submit","focus","blur","keyDown","keyUp","interact"]);
export const INTERACTION_MODIFIERS = Object.freeze(["ctrl","shift","alt","meta"]);
const normalizeModifiers = raw => [...new Set((Array.isArray(raw) ? raw : String(raw ?? "").split("+")).map(value => String(value).trim().toLowerCase()).filter(value => INTERACTION_MODIFIERS.includes(value)))].sort((a,b) => INTERACTION_MODIFIERS.indexOf(a) - INTERACTION_MODIFIERS.indexOf(b));
export const INTERACTION_ACTIONS = Object.freeze(["roll","calculate","update","open","toggle","interact","execute"]);
export const INTERACTION_OPERATORS = Object.freeze(["equals","notEquals","greaterThan","greaterOrEqual","lessThan","lessOrEqual","contains","isEmpty","isNotEmpty"]);
import { NEXUS_SKILLS } from "./skills.js";
import { evaluateNexusFormula, evaluateNexusCondition, evaluateNexusExpression } from "./formula-engine.js";

const LEGACY = {
  roll: { event:"click", type:"roll", config:c=>({formula:c.rollFormula??""}) },
  "toggle-component": { event:"click", type:"toggle", config:c=>({targetId:c.actionTargetId??""}) }
};
const newId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`}`;
export const normalizeInteractionPropertyPath = raw => {
  const path=String(raw??"").trim().replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "").replace(/^@/, "").replace(/^actor\./, "").replace(/^system\./, "");
  return path && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path) && !path.split(".").some(k=>["__proto__","prototype","constructor"].includes(k)) ? path : "";
};
const safePath = normalizeInteractionPropertyPath;
const normalizeTrigger = (t,i) => {
  const event=String(t?.event??t??"");
  return INTERACTION_EVENTS.includes(event) ? {id:String(t?.id??`trigger-${i+1}`),event,modifiers:normalizeModifiers(t?.modifiers),key:String(t?.key??"").slice(0,40),durationMs:Math.max(100,Math.min(5000,Number(t?.durationMs)||600))} : null;
};
const normalizeCondition = (c,i) => {
  if(!c || typeof c!=="object")return null;
  const path=safePath(c.path)??"";
  return {id:String(c.id??`condition-${i+1}`),path,operator:INTERACTION_OPERATORS.includes(c.operator)?c.operator:"equals",value:String(c.value??"")};
};
const normalizeAction = (a,i) => {
  if(!a || !INTERACTION_ACTIONS.includes(a.type))return null;
  const config=a.config && typeof a.config==="object" && !Array.isArray(a.config)?{...a.config}:{};
  for(const key of ["path","targetPath"])if(config[key]!==undefined)config[key]=safePath(config[key]);
  return {id:String(a.id??`action-${i+1}`),type:a.type,enabled:a.enabled!==false,config};
};
export function normalizeInteraction(raw) {
  if(!raw || typeof raw!=="object")return null;
  const source=Array.isArray(raw.triggers)?raw.triggers:[raw.trigger].filter(Boolean);
  const execution=raw.execution??{};
  return {
    id:String(raw.id??newId("interaction")),name:String(raw.name??"Novo fluxo").slice(0,60),enabled:raw.enabled!==false,
    triggers:source.map(normalizeTrigger).filter(Boolean),
    conditions:(Array.isArray(raw.conditions)?raw.conditions:[]).map(normalizeCondition).filter(Boolean),
    conditionJoin:raw.conditionJoin==="any"?"any":"all",
    actions:(Array.isArray(raw.actions)?raw.actions:[]).map(normalizeAction).filter(Boolean),
    execution:{mode:"sequential",onError:execution.onError==="continue"?"continue":"stop"}
  };
}
export function normalizeComponentRepresentation(raw) {
  if (!raw || typeof raw !== "object") return { enabled: false, sourcePath: "", rules: [] };
  const rules = (Array.isArray(raw.rules) ? raw.rules : []).slice(0, 32).map((rule, index) => ({
    id: String(rule?.id ?? ("representation-rule-" + (index + 1))),
    name: String(rule?.name ?? ("Regra " + (index + 1))).trim().slice(0, 60),
    condition: String(rule?.condition ?? "").trim().slice(0, 500),
    content: rule?.content === undefined ? "" : String(rule.content).slice(0, 1000),
    icon: String(rule?.icon ?? "").slice(0, 120),
    label: String(rule?.label ?? "").slice(0, 100),
    output: String(rule?.output ?? "").trim().slice(0, 500)
  }));
  return { enabled: raw.enabled === true, sourcePath: safePath(raw.sourcePath), rules };
}

function representationValueToString(value) {
  if (value === undefined || value === null) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return value.map(representationValueToString).filter(Boolean).join(", ");
  if (typeof value === "object") {
    for (const key of ["url", "href", "src", "value", "label", "name"]) {
      const candidate = value[key];
      if (candidate !== undefined && candidate !== null && ["string", "number", "boolean"].includes(typeof candidate)) return String(candidate);
    }
  }
  return "";
}

function interpolateRepresentationContent(template, resolveProperty) {
  const source = String(template ?? "");
  const tokenPattern = /\{\{\s*([^{}]+?)\s*\}\}|@([A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*)/g;
  return source.replace(tokenPattern, (token, wrappedExpression, barePath) => {
    const expression = String(wrappedExpression ?? (barePath ? "@" + barePath : "")).trim();
    if (/^icon:/i.test(expression)) return token;
    const imageToken = expression.match(/^image:\s*(.+)$/i);
    if (imageToken) {
      const reference = imageToken[1].trim(), path = safePath(reference);
      if (path && /^[\w@.-]+$/.test(reference)) {
        const display = reference.startsWith("@");
        const resolved = resolveProperty(path, { display, raw: !display });
        const imageSource = representationValueToString(resolved);
        if (imageSource) return "{{image:" + imageSource + "}}";
      }
      return token;
    }
    const directPath = safePath(expression);
    if (directPath && /^@?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(expression)) {
      const display = expression.startsWith("@");
      const direct = resolveProperty(directPath, { display, raw: !display });
      return direct !== undefined && direct !== null ? representationValueToString(direct) : "";
    }
    const evaluated = wrappedExpression ? evaluateNexusExpression(expression, resolveProperty) : null;
    return evaluated !== null && evaluated !== undefined ? representationValueToString(evaluated) : "";
  });
}
function representationConditionPasses(condition, resolveProperty) {
  const expression = String(condition ?? "").trim();
  if (!expression) return false;
  const evaluated = evaluateNexusCondition(expression, resolveProperty);
  if (typeof evaluated === "boolean") return evaluated;
  const wrapped = expression.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
  const reference = String(wrapped?.[1] ?? expression).trim();
  const directPath = safePath(reference);
  if (!directPath || !/^@?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(reference)) return false;
  const display = reference.startsWith("@");
  const value = resolveProperty(directPath, { display, raw: !display });
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.length > 0;
  return value !== undefined && value !== null;
}

export function evaluateComponentRepresentation(raw, resolveProperty, sourcePathOverride = "") {
  const config = normalizeComponentRepresentation(raw);
  const sourcePath = safePath(sourcePathOverride || config.sourcePath);
  if (!config.enabled || !sourcePath || typeof resolveProperty !== "function") return null;
  const sourceValue = resolveProperty(sourcePath);

  // Rules are evaluated in their saved order. A matching rule must never hide
  // the component's normal value merely because its interpolation is empty.
  for (const [index, rule] of config.rules.entries()) {
    if (!representationConditionPasses(rule.condition, resolveProperty)) continue;

    const calculated = rule.output ? evaluateNexusFormula(rule.output, resolveProperty) : null;
    let content = String(rule.content ?? "");
    if (content.trim()) {
      content = interpolateRepresentationContent(content, resolveProperty);
    } else {
      content = [rule.icon, rule.label, representationValueToString(calculated ?? sourceValue)]
        .filter(value => value !== undefined && value !== null && value !== "")
        .join(" ");
    }

    if (!String(content ?? "").trim()) {
      content = representationValueToString(calculated ?? sourceValue);
      if (!content) continue;
    }

    return {
      active: true,
      ruleId: rule.id,
      ruleIndex: index,
      sourcePath,
      sourceValue,
      content: String(content),
      icon: rule.icon,
      label: rule.label,
      value: calculated ?? sourceValue
    };
  }
  return null;
}

export function getComponentInteractions(component) {
  if(Array.isArray(component?.interactions))return component.interactions.map(normalizeInteraction).filter(Boolean);
  const legacy=LEGACY[component?.actionType];
  return legacy?[normalizeInteraction({id:"legacy-"+component.actionType,name:component.actionType==="roll"?"Rolagem":"Alternar componente",trigger:{event:legacy.event},actions:[{id:"legacy-action",type:legacy.type,config:legacy.config(component)}]})]:[];
}

/** True when a component needs keyboard focus for a keyboard, focus, or blur trigger. */
export function hasKeyboardInteraction(component) {
  return getComponentInteractions(component).some(flow =>
    flow.enabled &&
    flow.triggers.some(trigger => ["focus", "blur"].includes(trigger.event) || (["keyDown", "keyUp"].includes(trigger.event) && !!String(trigger.key ?? "").trim())) &&
    flow.actions.some(action => action.enabled)
  );
}
const getPath=(actor,path)=>safePath(path)?.split(".").reduce((v,k)=>v?.[k],actor?.system??{});
const conditionPasses=(condition,actor)=>{
  if(!condition?.path)return false;
  const actual=getPath(actor,condition.path), expected=condition.value, a=Number(actual), b=Number(expected);
  switch(condition.operator){
    case "notEquals":return String(actual??"")!==expected;
    case "greaterThan":return Number.isFinite(a)&&Number.isFinite(b)&&a>b;
    case "greaterOrEqual":return Number.isFinite(a)&&Number.isFinite(b)&&a>=b;
    case "lessThan":return Number.isFinite(a)&&Number.isFinite(b)&&a<b;
    case "lessOrEqual":return Number.isFinite(a)&&Number.isFinite(b)&&a<=b;
    case "contains":return String(actual??"").includes(expected);
    case "isEmpty":return actual===undefined||actual===null||actual==="";
    case "isNotEmpty":return actual!==undefined&&actual!==null&&actual!=="";
    default:return String(actual??"")===expected;
  }
};
export function interactionMatches(flow,eventName,context={}) {
  const modifiers = normalizeModifiers(context.modifiers);
  const triggerMatches = flow?.triggers?.some(trigger =>
    trigger.event === eventName &&
    normalizeModifiers(trigger.modifiers).join("+") === modifiers.join("+") &&
    (!["keyDown", "keyUp"].includes(trigger.event) || !!String(trigger.key ?? "").trim()) &&
    (!trigger.key || String(context.key ?? "").toLocaleLowerCase() === String(trigger.key).toLocaleLowerCase()) &&
    (trigger.event !== "hold" || Number(context.durationMs ?? trigger.durationMs) >= trigger.durationMs)
  );
  if(!flow?.enabled||!triggerMatches)return false;
  if(!flow.conditions.length)return true;
  const values=flow.conditions.map(c=>conditionPasses(c,context.actor));
  return flow.conditionJoin==="any"?values.some(Boolean):values.every(Boolean);
}
export function getTriggeredActions(component,eventName="click",context={}) {
  const skippedInteractionIds = new Set(Array.isArray(context.skipInteractionIds) ? context.skipInteractionIds.map(String) : []);
  return getComponentInteractions(component).filter(flow=>!skippedInteractionIds.has(flow.id)&&interactionMatches(flow,eventName,context))
    .flatMap(flow=>flow.actions.filter(a=>a.enabled).map(a=>({...a,interactionId:flow.id})));
}
export async function executeTriggeredActions(component,eventName,executeAction,context={}) {
  if(typeof executeAction!=="function")return [];
  const results=[];
  const skippedInteractionIds = new Set(Array.isArray(context.skipInteractionIds) ? context.skipInteractionIds.map(String) : []);
  for(const flow of getComponentInteractions(component).filter(f=>!skippedInteractionIds.has(f.id)&&interactionMatches(f,eventName,context))){
    for(const action of flow.actions.filter(a=>a.enabled)){
      try{results.push(await executeAction(action,component,context));}
      catch(error){if(flow.execution.onError!=="continue")throw error;results.push({error});}
    }
  }
  return results;
}
export function createInteractionFlow() {
  return normalizeInteraction({id:newId("interaction"),name:"Novo fluxo",triggers:[{id:newId("trigger"),event:"click"}],actions:[{id:newId("action"),type:"roll",config:{formula:"1d20"}}]});
}
export function instantiateInteractionTemplate(template) {
  const flow=normalizeInteraction(structuredClone(template?.flow??template));
  if(!flow)return createInteractionFlow();
  flow.id=newId("interaction");
  flow.triggers=flow.triggers.map(item=>({...item,id:newId("trigger")}));
  flow.conditions=flow.conditions.map(item=>({...item,id:newId("condition")}));
  flow.actions=flow.actions.map(item=>({...item,id:newId("action"),config:{...item.config}}));
  return flow;
}
export function getInteractionLibrary(actor) {
  let entries=[];
  try { entries=globalThis.game?.settings?.get?.("nexus","interactionLibrary")??[]; } catch {}
  if(!Array.isArray(entries)||!entries.length) entries=actor?.getFlag?.("nexus","interactionLibrary")??[];
  return Array.isArray(entries)?entries.filter(item=>item&&typeof item.id==="string"&&item.flow).map(item=>({id:item.id,name:String(item.name??item.flow.name??"Fluxo salvo"),flow:normalizeInteraction(item.flow)})).filter(item=>item.flow):[];
}
export async function saveInteractionToLibrary(actor,flow) {
  if(!flow)return [];
  const entries=getInteractionLibrary(actor);
  const entry={id:newId("library-flow"),name:String(flow.name??"Fluxo salvo").slice(0,60),flow:normalizeInteraction(structuredClone(flow))};
  entries.push(entry);
  const settings=globalThis.game?.settings;
  if(typeof settings?.set==="function") await settings.set("nexus","interactionLibrary",entries);
  else if(actor?.setFlag) await actor.setFlag("nexus","interactionLibrary",entries);
  return entries;
}
export async function deleteInteractionFromLibrary(actor, id) {
  if (!id) return getInteractionLibrary(actor);
  const entries = getInteractionLibrary(actor);
  const next = entries.filter(entry => entry.id !== id);
  if (next.length === entries.length) return entries;
  const settings = globalThis.game?.settings;
  if (typeof settings?.set === "function") await settings.set("nexus", "interactionLibrary", next);
  const actorEntries = actor?.getFlag?.("nexus", "interactionLibrary");
  if (Array.isArray(actorEntries) && actor?.setFlag) await actor.setFlag("nexus", "interactionLibrary", actorEntries.filter(entry => entry.id !== id));
  if (typeof settings?.set !== "function" && !Array.isArray(actorEntries) && actor?.setFlag) await actor.setFlag("nexus", "interactionLibrary", next);
  return next;
}
export function ensureEditableInteractions(component) {
  component.interactions=getComponentInteractions(component).map(flow=>structuredClone(flow));
  return component.interactions;
}
export function applyInteractionEditorChange(component,data,value) {  if (data.scope === "propertyPresentation" || data.scope === "propertyPresentationRule") {
    const current = normalizeComponentRepresentation(component.propertyPresentation ?? component.representation);
    if (data.scope === "propertyPresentation") {
      if (data.field === "enabled") current.enabled = !!value;
      else if (data.field === "sourcePath") current.sourcePath = safePath(value);
    } else {
      const rule = current.rules[Number(data.ruleIndex)];
      if (!rule) return false;
      if (data.field === "name") rule.name = String(value ?? "").trim().slice(0, 60);
      else if (data.field === "condition") rule.condition = String(value ?? "").trim().slice(0, 500);
      else if (data.field === "content") rule.content = String(value ?? "").slice(0, 1000);
    }
    component.propertyPresentation = current;
    return true;
  }
  if (data.scope === "representation" || data.scope === "representationRule") {
    const representation = normalizeComponentRepresentation(component.representation);
    if (data.scope === "representation") {
      if (data.field === "enabled") representation.enabled = !!value;
      else if (data.field === "sourcePath") representation.sourcePath = safePath(value);
      component.representation = representation;
      return true;
    }
    const rule = representation.rules[Number(data.ruleIndex)];
    if (!rule) return false;
    if (data.field === "condition") rule.condition = String(value ?? "").trim().slice(0, 500);
    else if (data.field === "icon") rule.icon = String(value ?? "").slice(0, 120);
    else if (data.field === "label") rule.label = String(value ?? "").slice(0, 100);
    else if (data.field === "output") rule.output = String(value ?? "").trim().slice(0, 500);
    component.representation = representation;
    return true;
  }
  const flow=ensureEditableInteractions(component).find(f=>f.id===data.interactionId);if(!flow)return false;
  const trigger=flow.triggers[Number(data.triggerIndex)],condition=flow.conditions[Number(data.conditionIndex)],action=flow.actions[Number(data.actionIndex)];
  if(data.scope==="flow"){
    if(data.field==="name")flow.name=String(value).slice(0,60);
    else if(data.field==="enabled")flow.enabled=!!value;
    else if(data.field==="conditionJoin")flow.conditionJoin=value==="any"?"any":"all";
    else if(data.field==="onError")flow.execution.onError=value==="continue"?"continue":"stop";
  }else if(data.scope==="trigger"&&trigger&&data.field==="event"){trigger.event=INTERACTION_EVENTS.includes(value)?value:"click";if(!["keyDown","keyUp"].includes(trigger.event))trigger.key="";}
  else if(data.scope==="trigger"&&trigger&&data.field==="modifiers")trigger.modifiers=normalizeModifiers(value);
  else if(data.scope==="trigger"&&trigger&&data.field==="key")trigger.key=String(value??"").slice(0,40);
  else if(data.scope==="condition"&&condition){
    if(data.field==="path")condition.path=safePath(value)??"";
    else if(data.field==="operator")condition.operator=INTERACTION_OPERATORS.includes(value)?value:"equals";
    else if(data.field==="value")condition.value=String(value).slice(0,120);
  }else if(data.scope==="action"&&action){
    if(data.field==="type"){action.type=INTERACTION_ACTIONS.includes(value)?value:"roll";action.config=action.type==="roll"?{formula:"1d20"}:{};}
    else if(data.field==="enabled")action.enabled=!!value;
    else if(data.field.startsWith("config.")){
      const key=data.field.slice(7);action.config[key]=["path","targetPath"].includes(key)?safePath(value):String(value).slice(0,500);
    }
  }
  return true;
}
export function applyInteractionEditorCommand(component,command,data={}) {  if (["add-property-rule", "remove-property-rule", "move-property-rule"].includes(command)) {
    const presentation = normalizeComponentRepresentation(component.propertyPresentation ?? component.representation);
    const index = Number(data.ruleIndex);
    if (command === "add-property-rule") {
      presentation.enabled = true;
      presentation.sourcePath = safePath(data.sourcePath) || presentation.sourcePath;
      presentation.rules.push({ id: newId("property-rule"), name: "Regra " + (presentation.rules.length + 1), condition: "", content: "{{@" + (presentation.sourcePath || "identity.level") + "}}" });
    } else {
      if (index < 0 || index >= presentation.rules.length) return false;
      if (command === "remove-property-rule") presentation.rules.splice(index, 1);
      else {
        const target = index + Number(data.direction);
        if (target < 0 || target >= presentation.rules.length) return false;
        [presentation.rules[index], presentation.rules[target]] = [presentation.rules[target], presentation.rules[index]];
      }
    }
    component.propertyPresentation = presentation;
    return true;
  }
  if (["add-representation-rule","remove-representation-rule","move-representation-rule"].includes(command)) {
    const representation = normalizeComponentRepresentation(component.representation);
    const index = Number(data.ruleIndex);
    if (command === "add-representation-rule") {
      representation.rules.push({ id: newId("representation-rule"), condition: "", icon: "✦", label: "", output: "" });
    } else {
      if (index < 0 || index >= representation.rules.length) return false;
      if (command === "remove-representation-rule") representation.rules.splice(index, 1);
      else {
        const target = index + Number(data.direction);
        if (target < 0 || target >= representation.rules.length) return false;
        [representation.rules[index], representation.rules[target]] = [representation.rules[target], representation.rules[index]];
      }
    }
    component.representation = representation;
    return true;
  }
  const flows=ensureEditableInteractions(component),flow=flows.find(f=>f.id===data.interactionId);
  if(command==="add-flow"){flows.push(createInteractionFlow());return true;}
  if(command==="add-library-flow"&&data.template){flows.push(instantiateInteractionTemplate(data.template));return true;}
  if(command==="remove-flow"&&flow){component.interactions=flows.filter(f=>f.id!==flow.id);return true;}
  if(!flow)return false;
  if(command==="add-trigger")flow.triggers.push({id:newId("trigger"),event:"click"});
  else if(command==="remove-trigger")flow.triggers.splice(Number(data.triggerIndex),1);
  else if(command==="add-condition")flow.conditions.push({id:newId("condition"),path:"",operator:"equals",value:""});
  else if(command==="remove-condition")flow.conditions.splice(Number(data.conditionIndex),1);
  else if(command==="add-action")flow.actions.push({id:newId("action"),type:"roll",enabled:true,config:{formula:"1d20"}});
  else if(command==="remove-action")flow.actions.splice(Number(data.actionIndex),1);
  else if(command==="move-action"){
    const from=Number(data.actionIndex),to=from+Number(data.direction);
    if(from<0||to<0||from>=flow.actions.length||to>=flow.actions.length)return false;
    [flow.actions[from],flow.actions[to]]=[flow.actions[to],flow.actions[from]];
  }else return false;
  return true;
}
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node;};
const bind=(input,scope,flowId,key,extra={})=>{input.dataset.interactionField="";input.dataset.interactionScope=scope;input.dataset.interactionId=flowId;input.dataset.interactionField=key;Object.entries(extra).forEach(([k,v])=>input.dataset[k]=String(v));};
const btn=(label,command,flowId,extra={})=>{const b=el("button","nexus-interaction-button",label);b.type="button";b.dataset.interactionAction=command;b.dataset.interactionId=flowId;b.setAttribute("aria-label",label);Object.entries(extra).forEach(([k,v])=>b.dataset[k]=String(v));return b;};
const iconBtn=(label,icon,command,flowId,extra={})=>{const b=btn("",command,flowId,extra);b.classList.add("is-icon");b.title=label;const glyph=el("i","fa-solid "+icon);glyph.setAttribute("aria-hidden","true");b.append(glyph);return b;};
const control=(type,value,options=[],aria="")=>{const input=el(type);if(type==="select")for(const [v,l] of options){const o=el("option","",l);o.value=v;input.append(o);}if(type==="checkbox")input.checked=!!value;else input.value=String(value??"");if(aria)input.setAttribute("aria-label",aria);return input;};
const field=(label,input,scope,id,key,extra={})=>{const wrap=el("label","nexus-interaction-field");if(label)wrap.append(el("span","",label));bind(input,scope,id,key,extra);wrap.append(input);return wrap;};
const events=[["click","Clique esquerdo"],["doubleClick","Duplo clique"],["rightClick","Clique direito"],["middleClick","Clique do meio"],["pointerDown","Pressionar botão"],["pointerUp","Soltar botão"],["hold","Segurar"],["hover","Passar o cursor"],["change","Alterar valor"],["submit","Enviar formulário"],["focus","Receber foco"],["blur","Perder foco"],["keyDown","Atalho de teclado"],["keyUp","Atalho de teclado (ao soltar)"],["interact","Interação encadeada"]];
const modifierOptions=[["","Nenhum"],["shift","Shift"],["ctrl","Ctrl"],["alt","Alt"],["meta","Meta"],["ctrl+shift","Ctrl + Shift"],["ctrl+alt","Ctrl + Alt"],["shift+alt","Shift + Alt"],["ctrl+shift+alt","Ctrl + Shift + Alt"],["ctrl+meta","Ctrl + Meta"],["shift+meta","Shift + Meta"],["alt+meta","Alt + Meta"],["ctrl+shift+meta","Ctrl + Shift + Meta"],["ctrl+alt+meta","Ctrl + Alt + Meta"],["shift+alt+meta","Shift + Alt + Meta"],["ctrl+shift+alt+meta","Ctrl + Shift + Alt + Meta"]];
const actions=[["roll","Rolagem"],["calculate","Calcular"],["update","Atualizar propriedade"],["open","Abrir"],["toggle","Alternar componente"],["interact","Interagir com componente"],["execute","Executar operação"]];
const operators=[["equals","Igual a"],["notEquals","Diferente de"],["greaterThan","Maior que"],["greaterOrEqual","Maior ou igual"],["lessThan","Menor que"],["lessOrEqual","Menor ou igual"],["contains","Contém"],["isEmpty","Está vazio"],["isNotEmpty","Não está vazio"]];
const buildActionConfig=(parent,flow,action,index,components)=>{
 const add=(label,key,value,opts=null)=>{const input=control(opts?"select":"input",value,opts??[],label);if(key==="formula")input.dataset.rollFormulaInput="";const wrapped=field(label,input,"action",flow.id,"config."+key,{actionIndex:index});parent.append(wrapped);if(key==="value"){input.dataset.interactionMediaInput="";const preview=el("div","nexus-data-media-preview");preview.dataset.interactionMediaPreview="";renderInteractionMediaPreview(preview,value);parent.append(preview);}};
 if(action.type==="roll"){if(action.config.mode==="skill")add("Perícia","skillKey",action.config.skillKey??"athletics",NEXUS_SKILLS.map(x=>[x.key,x.name]));else add("Fórmula","formula",action.config.formula??"1d20");}
 if(action.type==="calculate"){add("Fórmula","formula",action.config.formula??"");add("Salvar resultado em","targetPath",action.config.targetPath??"");}
 if(action.type==="update"){add("Propriedade","path",action.config.path??"");add("Operação","operation",action.config.operation??"set",[["set","Definir"],["add","Somar"],["subtract","Subtrair"]]);add("Valor","value",action.config.value??"0");}
 if(["open","toggle","interact"].includes(action.type)){add("Componente de destino","targetId",action.config.targetId??"",[["","Selecione"],...components.filter(x=>x.id!==flow.componentId).map(x=>[x.id,x.customLabel||x.type||x.id])]);if(action.type==="interact")add("Evento de destino","event",action.config.event??"interact",events);if(action.type==="open")add("UUID do documento (opcional)","uuid",action.config.uuid??"");}
 if(action.type==="execute"){add("Operação","operation",action.config.operation??"refresh-sheet",[["refresh-sheet","Atualizar ficha"],["notify","Notificação"]]);if(action.config.operation==="notify")add("Mensagem","message",action.config.message??"");}
};
const collectInteractionPropertyPaths=actor=>{
 const paths=new Set(["name","identity.level","identity.lineage","identity.legacy","resources.pv.value","resources.pv.max","resources.pm.value","resources.pm.max","resources.pe.value","resources.pe.max","combat.defense","combat.movement","combat.desl","combat.ddr","combat.mb","attributes.body","attributes.mind","attributes.soul"]);
 const walk=(value,prefix="",depth=0)=>{if(!value||typeof value!=="object"||depth>6)return;for(const [key,child] of Object.entries(value)){if(["__proto__","prototype","constructor"].includes(key))continue;const path=prefix?prefix+"."+key:key;if(["number","string","boolean"].includes(typeof child))paths.add(path);else if(child&&typeof child==="object"){if(Object.hasOwn(child,"value"))paths.add(path+".value");if(Object.hasOwn(child,"max"))paths.add(path+".max");walk(child,path,depth+1);}}};
 walk(actor?.system??{});return [...paths].filter(p=>/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(p)).sort((a,b)=>a.localeCompare(b,"pt-BR"));
};
export function renderInteractionEditor(container,component,components=[],library=[],actor=null){
 if(!container)return;const previous=container.dataset.activeInteractionId??"",flows=getComponentInteractions(component),activeId=flows.some(x=>x.id===previous)?previous:(flows[0]?.id??"");
 container.replaceChildren();container.dataset.activeInteractionId=activeId;
 const heading=el("div","nexus-interaction-editor-heading"),title=el("strong","nexus-interaction-editor-title","Fluxos"),toolbar=el("div","nexus-interaction-editor-toolbar");
 if(library.length){const select=control("select","",[["","Fluxo salvo…"],...library.map(x=>[x.id,x.name])],"Selecionar fluxo salvo");select.dataset.interactionLibrarySelect="";toolbar.append(select,btn("Inserir","add-library-flow",""));}
 toolbar.append(btn("＋ Novo fluxo","add-flow",""));heading.append(title,toolbar);
 container.append(heading);
 if(!flows.length){const empty=el("div","nexus-interaction-empty-state");empty.append(el("strong","","Nenhum fluxo configurado"),btn("＋ Criar fluxo","add-flow",""));container.append(empty);return;}
 const tabs=el("nav","nexus-interaction-flow-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Fluxos");
 for(const flow of flows){const tab=el("button","nexus-interaction-flow-tab",flow.name||"Novo fluxo");tab.type="button";tab.dataset.interactionFlowTab=flow.id;tab.setAttribute("role","tab");tab.setAttribute("aria-selected",String(flow.id===activeId));tab.classList.toggle("active",flow.id===activeId);tabs.append(tab);}
 heading.append(tabs);
 const panels=el("div","nexus-interaction-flows");
 for(const flow of flows){
  const panel=el("section","nexus-interaction-flow");panel.dataset.interactionId=flow.id;panel.dataset.interactionFlowPanel=flow.id;panel.hidden=flow.id!==activeId;panel.setAttribute("role","tabpanel");
  const flowHead=el("div","nexus-interaction-flow-heading"),name=control("input",flow.name,[],"Nome do fluxo");name.className="nexus-interaction-flow-name";name.placeholder="Nome do fluxo";bind(name,"flow",flow.id,"name");flowHead.append(name);
  const flowEnabled=control("checkbox",flow.enabled,[],"Ativar fluxo");flowHead.append(field("Ativo",flowEnabled,"flow",flow.id,"enabled"));
  const flowTools=el("div","nexus-interaction-flow-actions");flowTools.append(iconBtn("Salvar na biblioteca","fa-bookmark","save-flow",flow.id),iconBtn("Excluir fluxo","fa-trash","remove-flow",flow.id));flowHead.append(flowTools);panel.append(flowHead);
  const guided=el("div","nexus-interaction-guided");
  const triggers=el("section","nexus-interaction-group nexus-interaction-trigger-group"),triggerHead=el("div","nexus-interaction-group-heading");
  triggerHead.append(el("h6","","Gatilhos"),btn("＋ Adicionar","add-trigger",flow.id));
  triggers.append(triggerHead);
  for(const [i,tr] of flow.triggers.entries()){
    const row=el("div","nexus-interaction-trigger-row"),select=control("select",tr.event,events,"Evento"),modifiers=control("select",(tr.modifiers??[]).join("+"),modifierOptions,"Modificadores");
    const eventField=field("Tipo",select,"trigger",flow.id,"event",{triggerIndex:i});
    const modifierField=field("Modificadores",modifiers,"trigger",flow.id,"modifiers",{triggerIndex:i});
    const duration=control("number",tr.durationMs??600,[],"Duração mínima em milissegundos");duration.min="100";duration.max="5000";duration.step="50";
    const durationField=field("Duração (ms)",duration,"trigger",flow.id,"durationMs",{triggerIndex:i});durationField.hidden=tr.event!=="hold";
    const keyLabel=String(tr.key??"");
    const captureLabel=keyLabel?(keyLabel===" "?"Espaço":keyLabel)+" · "+normalizeModifiers(tr.modifiers).map(x=>x.toUpperCase()).join("+"):"Definir tecla…";
    const capture=btn(captureLabel,"capture-key",flow.id,{triggerIndex:i});
    capture.dataset.interactionScope="trigger";capture.dataset.interactionField="key";capture.dataset.capturedKey=tr.key??"";
    capture.title=tr.key?"Clique para alterar a tecla":"Clique e pressione a tecla desejada";
    capture.hidden=!["keyDown","keyUp"].includes(tr.event);
    const keyField=el("label","nexus-interaction-field");keyField.append(el("span","","Tecla"),capture);keyField.hidden=capture.hidden;
    const clearKey=iconBtn("Limpar tecla","fa-xmark","clear-key",flow.id,{triggerIndex:i});clearKey.hidden=!tr.key;
    const remove=iconBtn("Remover gatilho","fa-trash","remove-trigger",flow.id,{triggerIndex:i});
    row.classList.toggle("is-key-trigger",!capture.hidden);
    row.append(eventField,modifierField,durationField,keyField,clearKey,remove);triggers.append(row);
  }  const conditions=el("section","nexus-interaction-group nexus-interaction-condition-group"),conditionHead=el("div","nexus-interaction-group-heading");conditionHead.append(el("h6","","Condições"));
  const join=control("select",flow.conditionJoin,[["all","Todas (E)"],["any","Qualquer (OU)"]],"Combinar condições");join.classList.add("nexus-interaction-condition-join");bind(join,"flow",flow.id,"conditionJoin");conditionHead.append(join,btn("＋","add-condition",flow.id));conditions.append(conditionHead);
  for(const [i,co] of flow.conditions.entries()){const row=el("div","nexus-interaction-condition-row"),property=control("input",co.path,[],"Propriedade");property.dataset.componentPathInput="";property.dataset.interactionPropertyInput="";property.placeholder="Buscar propriedade…";property.setAttribute("aria-autocomplete","list");const operator=control("select",co.operator,operators,"Operador"),value=control("input",co.value,[],"Valor");value.placeholder="Valor";bind(property,"condition",flow.id,"path",{conditionIndex:i});bind(operator,"condition",flow.id,"operator",{conditionIndex:i});bind(value,"condition",flow.id,"value",{conditionIndex:i});row.append(property,operator,value,iconBtn("Remover condição","fa-trash","remove-condition",flow.id,{conditionIndex:i}));conditions.append(row);}
  guided.append(triggers,conditions);panel.append(guided);
  const actionGroup=el("section","nexus-interaction-group nexus-interaction-actions"),actionHead=el("div","nexus-interaction-group-heading");actionHead.append(el("h6","","Ações"),btn("＋ Adicionar ação","add-action",flow.id));actionGroup.append(actionHead);
  for(const [i,action] of flow.actions.entries()){
   const card=el("article","nexus-interaction-action"),head=el("div","nexus-interaction-action-head"),actionTitle=el("strong","nexus-interaction-action-title",(actions.find(x=>x[0]===action.type)?.[1]??"Ação")+" · "+String(i+1).padStart(2,"0"));
   const active=control("checkbox",action.enabled!==false,[],"Ativar ação"),activeLabel=el("label","nexus-interaction-action-active");activeLabel.append(active,el("span","","Ativo"));bind(active,"action",flow.id,"enabled",{actionIndex:i});
   const tools=el("div","nexus-interaction-action-tools"),up=iconBtn("Mover ação para cima","fa-arrow-up","move-action",flow.id,{actionIndex:i,direction:-1}),down=iconBtn("Mover ação para baixo","fa-arrow-down","move-action",flow.id,{actionIndex:i,direction:1});up.disabled=i===0;down.disabled=i===flow.actions.length-1;tools.append(up,down,iconBtn("Remover ação","fa-trash","remove-action",flow.id,{actionIndex:i}));
   head.append(actionTitle,activeLabel,tools);card.append(head);
   const type=control("select",action.type,actions,"Tipo de ação");card.append(field("Tipo",type,"action",flow.id,"type",{actionIndex:i}));
   const config=el("div","nexus-interaction-action-config");buildActionConfig(config,{...flow,componentId:component.id},action,i,components);card.append(config);actionGroup.append(card);
  }
  panel.append(actionGroup);
  const advanced=el("details","nexus-interaction-execution"),summary=el("summary","","Execução avançada"),error=control("select",flow.execution.onError,[["stop","Interromper o fluxo"],["continue","Continuar próximas ações"]],"Se uma ação falhar");advanced.append(summary,field("Se uma ação falhar",error,"flow",flow.id,"onError"));panel.append(advanced);panels.append(panel);
 }
 container.append(panels);
}
export function renderInteractionMediaPreview(container, rawValue) {
  if (!container) return;
  container.replaceChildren();
  const source = String(rawValue ?? "").trim();
  const clean = source.split(/[?#]/)[0].toLowerCase();
  const dataType = source.match(/^data:(image|audio|video)\//i)?.[1]?.toLowerCase();
  const image = dataType === "image" || /\.(?:png|jpe?g|gif|apng|webp|avif|svg|bmp|tiff?|ico|heic|heif|jxl)$/i.test(clean);
  const audio = dataType === "audio" || /\.(?:mp3|ogg|wav|m4a|aac|flac|opus)$/i.test(clean);
  const video = dataType === "video" || /\.(?:mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp)$/i.test(clean);
  const safeProtocol = /^(https?:\/\/|data:(?:image|audio|video)\/)/i.test(source);
  const safeRelative = !/^[a-z][a-z0-9+.-]*:/i.test(source) && !/[{}]/.test(source);
  if (!source || !(image || audio || video) || !(safeProtocol || safeRelative)) { container.hidden = true; return; }
  const media = document.createElement(image ? "img" : audio ? "audio" : "video");
  media.className = "nexus-data-media-preview-content";
  if (image) { media.alt = "Prévia da mídia"; media.loading = "lazy"; }
  else { media.controls = true; media.preload = "metadata"; }
  media.src = source;
  container.append(media);
  container.hidden = false;
}
export function renderPropertyPresentationEditor(container, component, propertyPath = "") {
  if (!container) return;
  const config = normalizeComponentRepresentation(component?.propertyPresentation ?? component?.representation);
  const selectedPath = safePath(propertyPath || component?.dataPath || config.sourcePath);
  config.sourcePath = selectedPath;
  container.replaceChildren();
  container.dataset.componentId = String(component?.id ?? "");

  // Keep the empty editor intentionally minimal: adding a rule is the only
  // action needed before its condition and output fields become relevant.
  if (config.rules.length) {
    const rules = document.createElement("div");
    rules.className = "nexus-property-presentation-rules";
    config.rules.forEach((rule, index) => {
      const row = document.createElement("article"); row.className = "nexus-property-presentation-rule";
      const head = document.createElement("div"); head.className = "nexus-property-presentation-rule-head";
      const name = document.createElement("input");
      name.type = "text"; name.className = "nexus-property-presentation-rule-name";
      name.value = rule.name; name.maxLength = 60; name.setAttribute("aria-label", "Nome da regra");
      name.dataset.interactionScope = "propertyPresentationRule"; name.dataset.interactionField = "name";
      name.dataset.ruleIndex = String(index); name.dataset.componentId = String(component?.id ?? "");
      const controls = document.createElement("div"); controls.className = "nexus-property-presentation-rule-controls";
      const moveUp = document.createElement("button"); moveUp.type = "button"; moveUp.className = "nexus-icon-button"; moveUp.textContent = "↑"; moveUp.title = "Mover regra para cima"; moveUp.setAttribute("aria-label", moveUp.title); moveUp.disabled = index === 0;
      moveUp.dataset.interactionAction = "move-property-rule"; moveUp.dataset.direction = "-1"; moveUp.dataset.componentId = String(component?.id ?? ""); moveUp.dataset.ruleIndex = String(index);
      const moveDown = document.createElement("button"); moveDown.type = "button"; moveDown.className = "nexus-icon-button"; moveDown.textContent = "↓"; moveDown.title = "Mover regra para baixo"; moveDown.setAttribute("aria-label", moveDown.title); moveDown.disabled = index === config.rules.length - 1;
      moveDown.dataset.interactionAction = "move-property-rule"; moveDown.dataset.direction = "1"; moveDown.dataset.componentId = String(component?.id ?? ""); moveDown.dataset.ruleIndex = String(index);
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "nexus-icon-button"; remove.textContent = "×"; remove.title = "Remover regra"; remove.setAttribute("aria-label", remove.title);
      remove.dataset.interactionAction = "remove-property-rule"; remove.dataset.componentId = String(component?.id ?? ""); remove.dataset.ruleIndex = String(index);
      controls.append(moveUp, moveDown, remove); head.append(name, controls);
      const condition = document.createElement("input"); condition.type = "text"; condition.className = "nexus-property-presentation-condition";
      condition.value = rule.condition; condition.setAttribute("aria-label", "Condição da regra");
      condition.dataset.interactionScope = "propertyPresentationRule"; condition.dataset.interactionField = "condition";
      condition.dataset.ruleIndex = String(index); condition.dataset.componentId = String(component?.id ?? "");
      const conditionField = document.createElement("label"); conditionField.className = "nexus-property-presentation-field";
      conditionField.append(document.createTextNode("Condição"), condition);
      const content = document.createElement("textarea"); content.rows = 2; content.value = rule.content || (rule.output ? "{{" + rule.output + "}}" : "");
      content.setAttribute("aria-label", "Conteúdo exibido"); content.dataset.interactionScope = "propertyPresentationRule";
      content.dataset.interactionField = "content"; content.dataset.ruleIndex = String(index); content.dataset.componentId = String(component?.id ?? "");
      const contentField = document.createElement("label"); contentField.className = "nexus-property-presentation-field";
      contentField.append(document.createTextNode("Valor / conteúdo exibido"), content);
      content.dataset.interactionMediaInput = "";
      const mediaPreview = document.createElement("div"); mediaPreview.className = "nexus-data-media-preview"; mediaPreview.dataset.interactionMediaPreview = "";
      renderInteractionMediaPreview(mediaPreview, content.value);
      row.append(head, conditionField, contentField, mediaPreview); rules.append(row);
    });
    container.append(rules);
  }

  const add = document.createElement("button");
  add.type = "button";
  add.className = "nexus-property-presentation-add";
  add.textContent = "＋ Adicionar regra";
  add.dataset.interactionAction = "add-property-rule";
  add.dataset.componentId = String(component?.id ?? "");
  add.dataset.sourcePath = selectedPath;
  container.append(add);
}
