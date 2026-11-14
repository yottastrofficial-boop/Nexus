/**
 * Interaction Engine do NEXUS: fluxos com múltiplos Triggers, condições e Actions.
 * O motor não avalia JavaScript arbitrário.
 */
export const INTERACTION_EVENTS = Object.freeze(["click","doubleClick","rightClick","hover","change","submit","interact"]);
export const INTERACTION_ACTIONS = Object.freeze(["roll","calculate","update","open","toggle","interact","execute"]);
export const INTERACTION_OPERATORS = Object.freeze(["equals","notEquals","greaterThan","greaterOrEqual","lessThan","lessOrEqual","contains","isEmpty","isNotEmpty"]);
import { NEXUS_SKILLS } from "./skills.js";

const LEGACY = {
  roll: { event:"click", type:"roll", config:c=>({formula:c.rollFormula??""}) },
  "toggle-component": { event:"click", type:"toggle", config:c=>({targetId:c.actionTargetId??""}) }
};
const newId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`}`;
const safePath = raw => {
  const path=String(raw??"").trim().replace(/^actor\./,"").replace(/^system\./,"");
  return path && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path) && !path.split(".").some(k=>["__proto__","prototype","constructor"].includes(k)) ? path : "";
};
const normalizeTrigger = (t,i) => {
  const event=String(t?.event??t??"");
  return INTERACTION_EVENTS.includes(event) ? {id:String(t?.id??`trigger-${i+1}`),event} : null;
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
export function getComponentInteractions(component) {
  if(Array.isArray(component?.interactions))return component.interactions.map(normalizeInteraction).filter(Boolean);
  const legacy=LEGACY[component?.actionType];
  return legacy?[normalizeInteraction({id:"legacy-"+component.actionType,name:component.actionType==="roll"?"Rolagem":"Alternar componente",trigger:{event:legacy.event},actions:[{id:"legacy-action",type:legacy.type,config:legacy.config(component)}]})]:[];
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
  if(!flow?.enabled||!flow.triggers.some(t=>t.event===eventName))return false;
  if(!flow.conditions.length)return true;
  const values=flow.conditions.map(c=>conditionPasses(c,context.actor));
  return flow.conditionJoin==="any"?values.some(Boolean):values.every(Boolean);
}
export function getTriggeredActions(component,eventName="click",context={}) {
  return getComponentInteractions(component).filter(flow=>interactionMatches(flow,eventName,context))
    .flatMap(flow=>flow.actions.filter(a=>a.enabled).map(a=>({...a,interactionId:flow.id})));
}
export async function executeTriggeredActions(component,eventName,executeAction,context={}) {
  if(typeof executeAction!=="function")return [];
  const results=[];
  for(const flow of getComponentInteractions(component).filter(f=>interactionMatches(f,eventName,context))){
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
export function ensureEditableInteractions(component) {
  component.interactions=getComponentInteractions(component).map(flow=>structuredClone(flow));
  return component.interactions;
}
export function applyInteractionEditorChange(component,data,value) {
  const flow=ensureEditableInteractions(component).find(f=>f.id===data.interactionId);if(!flow)return false;
  const trigger=flow.triggers[Number(data.triggerIndex)],condition=flow.conditions[Number(data.conditionIndex)],action=flow.actions[Number(data.actionIndex)];
  if(data.scope==="flow"){
    if(data.field==="name")flow.name=String(value).slice(0,60);
    else if(data.field==="enabled")flow.enabled=!!value;
    else if(data.field==="conditionJoin")flow.conditionJoin=value==="any"?"any":"all";
    else if(data.field==="onError")flow.execution.onError=value==="continue"?"continue":"stop";
  }else if(data.scope==="trigger"&&trigger&&data.field==="event")trigger.event=INTERACTION_EVENTS.includes(value)?value:"click";
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
export function applyInteractionEditorCommand(component,command,data={}) {
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
const events=[["click","Clique"],["doubleClick","Duplo clique"],["rightClick","Clique direito"],["hover","Passar o cursor"],["change","Alterar valor"],["submit","Enviar formulário"],["interact","Interação encadeada"]];
const actions=[["roll","Rolagem"],["calculate","Calcular"],["update","Atualizar propriedade"],["open","Abrir"],["toggle","Alternar componente"],["interact","Interagir com componente"],["execute","Executar operação"]];
const operators=[["equals","Igual a"],["notEquals","Diferente de"],["greaterThan","Maior que"],["greaterOrEqual","Maior ou igual"],["lessThan","Menor que"],["lessOrEqual","Menor ou igual"],["contains","Contém"],["isEmpty","Está vazio"],["isNotEmpty","Não está vazio"]];
const buildActionConfig=(parent,flow,action,index,components)=>{
 const add=(label,key,value,opts=null)=>{const input=control(opts?"select":"input",value,opts??[],label);if(key==="formula")input.dataset.rollFormulaInput="";parent.append(field(label,input,"action",flow.id,"config."+key,{actionIndex:index}));};
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
 if(!flows.length){const empty=el("div","nexus-interaction-empty-state");empty.append(el("strong","","Nenhum fluxo configurado"),btn("＋ Criar fluxo","add-flow",""));container.append(heading,empty);return;}
 const tabs=el("nav","nexus-interaction-flow-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Fluxos");
 for(const flow of flows){const tab=el("button","nexus-interaction-flow-tab",flow.name||"Novo fluxo");tab.type="button";tab.dataset.interactionFlowTab=flow.id;tab.setAttribute("role","tab");tab.setAttribute("aria-selected",String(flow.id===activeId));tab.classList.toggle("active",flow.id===activeId);tabs.append(tab);}
 heading.append(tabs);container.append(heading);
 const panels=el("div","nexus-interaction-flows");
 for(const flow of flows){
  const panel=el("section","nexus-interaction-flow");panel.dataset.interactionId=flow.id;panel.dataset.interactionFlowPanel=flow.id;panel.hidden=flow.id!==activeId;panel.setAttribute("role","tabpanel");
  const flowHead=el("div","nexus-interaction-flow-heading"),name=control("input",flow.name,[],"Nome do fluxo");name.className="nexus-interaction-flow-name";name.placeholder="Nome do fluxo";bind(name,"flow",flow.id,"name");flowHead.append(name);
  const flowEnabled=control("checkbox",flow.enabled,[],"Ativar fluxo");flowHead.append(field("Ativo",flowEnabled,"flow",flow.id,"enabled"));
  const flowTools=el("div","nexus-interaction-flow-actions");flowTools.append(iconBtn("Salvar na biblioteca","fa-bookmark","save-flow",flow.id),iconBtn("Excluir fluxo","fa-trash","remove-flow",flow.id));flowHead.append(flowTools);panel.append(flowHead);
  const guided=el("div","nexus-interaction-guided");
  const triggers=el("section","nexus-interaction-group nexus-interaction-trigger-group"),triggerHead=el("div","nexus-interaction-group-heading");triggerHead.append(el("h6","","Gatilhos"),btn("＋","add-trigger",flow.id));triggers.append(triggerHead);
  for(const [i,tr] of flow.triggers.entries()){const row=el("div","nexus-interaction-trigger-row"),select=control("select",tr.event,events,"Evento");bind(select,"trigger",flow.id,"event",{triggerIndex:i});row.append(select,iconBtn("Remover gatilho","fa-trash","remove-trigger",flow.id,{triggerIndex:i}));triggers.append(row);}
  const conditions=el("section","nexus-interaction-group nexus-interaction-condition-group"),conditionHead=el("div","nexus-interaction-group-heading");conditionHead.append(el("h6","","Condições"));
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