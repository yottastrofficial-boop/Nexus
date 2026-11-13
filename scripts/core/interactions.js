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
  const path=safePath(c?.path);
  if(!path)return null;
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
    if(data.field==="path")condition.path=safePath(value);
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
  else if(command==="add-condition")flow.conditions.push({id:newId("condition"),path:"identity.level",operator:"greaterOrEqual",value:"1"});
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
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const field=(type,label,value,options=[])=>{
  const wrap=el("label","nexus-interaction-field"),caption=el("span","",label),input=el(type);
  if(type==="select")for(const [v,l] of options){const o=el("option","",l);o.value=v;input.append(o);}
  else if(type==="input"&&label==="Ativo")input.type="checkbox";
  else if(type==="input")input.type="text";
  if(input.type==="checkbox")input.checked=!!value;else input.value=String(value??"");
  wrap.append(caption,input);return {wrap,input};
};
const bind=(input,scope,flowId,key,extra={})=>{input.dataset.interactionField="";input.dataset.interactionScope=scope;input.dataset.interactionId=flowId;input.dataset.interactionField=key;Object.entries(extra).forEach(([k,v])=>input.dataset[k]=String(v));};
const btn=(label,command,flowId,extra={})=>{const b=el("button","nexus-interaction-button",label);b.type="button";b.dataset.interactionAction=command;b.dataset.interactionId=flowId;const accessibleLabel=label==="↑"?"Mover ação para cima":label==="↓"?"Mover ação para baixo":label;b.setAttribute("aria-label",accessibleLabel);if(accessibleLabel!==label)b.title=accessibleLabel;Object.entries(extra).forEach(([k,v])=>b.dataset[k]=String(v));return b;};
const iconBtn=(label,icon,command,flowId,extra={})=>{const b=btn("",command,flowId,extra);b.classList.add("is-icon");b.setAttribute("aria-label",label);b.title=label;const glyph=el("i",`fa-solid ${icon}`);glyph.setAttribute("aria-hidden","true");b.append(glyph);return b;};
const events=[["click","Clique"],["doubleClick","Duplo clique"],["rightClick","Clique direito"],["hover","Passar o cursor"],["change","Alterar valor"],["submit","Enviar formulário"],["interact","Interação encadeada"]];
const actions=[["roll","Rolagem"],["calculate","Calcular"],["update","Atualizar propriedade"],["open","Abrir"],["toggle","Alternar componente"],["interact","Interagir com componente"],["execute","Executar operação"]];
const operators=[["equals","Igual a"],["notEquals","Diferente de"],["greaterThan","Maior que"],["greaterOrEqual","Maior ou igual"],["lessThan","Menor que"],["lessOrEqual","Menor ou igual"],["contains","Contém"],["isEmpty","Está vazio"],["isNotEmpty","Não está vazio"]];
function actionConfig(parent,flow,action,index,components){
  const add=(label,key,value)=>{const f=field("input",label,value);bind(f.input,"action",flow.id,"config."+key,{actionIndex:index});parent.append(f.wrap);};
  if(action.type==="roll"){
    if(action.config.mode==="skill"){
      const skill=field("select","Perícia",action.config.skillKey??"athletics",NEXUS_SKILLS.map(item=>[item.key,item.name]));
      bind(skill.input,"action",flow.id,"config.skillKey",{actionIndex:index});parent.append(skill.wrap);
    }else add("Fórmula","formula",action.config.formula??"1d20");
  }
  if(action.type==="calculate"){add("Fórmula","formula",action.config.formula??"");add("Salvar resultado em","targetPath",action.config.targetPath??"");}
  if(action.type==="update"){
    add("Propriedade","path",action.config.path??"");
    const op=field("select","Operação",action.config.operation??"set",[["set","Definir"],["add","Somar"],["subtract","Subtrair"]]);bind(op.input,"action",flow.id,"config.operation",{actionIndex:index});parent.append(op.wrap);
    add("Valor","value",action.config.value??"0");
  }
  if(["open","toggle","interact"].includes(action.type)){
    const target=field("select","Componente de destino",action.config.targetId??"",[["","Selecione"],...components.filter(c=>c.id!==flow.componentId).map(c=>[c.id,c.customLabel||c.type||c.id])]);
    bind(target.input,"action",flow.id,"config.targetId",{actionIndex:index});parent.append(target.wrap);
    if(action.type==="interact"){const ev=field("select","Evento de destino",action.config.event??"interact",events);bind(ev.input,"action",flow.id,"config.event",{actionIndex:index});parent.append(ev.wrap);}
    if(action.type==="open")add("UUID do documento (opcional)","uuid",action.config.uuid??"");
  }
  if(action.type==="execute"){
    const op=field("select","Operação",action.config.operation??"refresh-sheet",[["refresh-sheet","Atualizar ficha"],["notify","Notificação"]]);bind(op.input,"action",flow.id,"config.operation",{actionIndex:index});parent.append(op.wrap);
    if(action.config.operation==="notify")add("Mensagem","message",action.config.message??"");
  }
}
export function renderInteractionEditor(container,component,components=[],library=[]) {
  if(!container)return;
  const previousFlowId=container.dataset.activeInteractionId??"";
  container.replaceChildren();
  const flows=getComponentInteractions(component);
  const activeFlowId=flows.some(flow=>flow.id===previousFlowId)?previousFlowId:(flows[0]?.id??"");
  container.dataset.activeInteractionId=activeFlowId;

  const head=el("header","nexus-interaction-editor-heading");
  const title=el("div","nexus-interaction-editor-title");
  title.append(el("strong","","Fluxos"),el("span","",flows.length?String(flows.length)+" configurado(s)":"Nenhum configurado"));
  const toolbar=el("div","nexus-interaction-editor-toolbar");
  toolbar.append(btn("＋ Novo fluxo","add-flow",""));
  head.append(title,toolbar);
  container.append(head);

  if(library.length){
    const libraryRow=el("div","nexus-interaction-library-row");
    const libraryLabel=el("label","nexus-interaction-library-label");
    libraryLabel.append(el("span","","Modelo salvo"));
    const select=el("select","nexus-interaction-library-select");
    const placeholder=el("option","","Selecionar fluxo…");placeholder.value="";select.append(placeholder);
    for(const item of library){const option=el("option","",item.name);option.value=item.id;select.append(option);}
    select.dataset.interactionLibrarySelect="";
    libraryLabel.append(select);
    libraryRow.append(libraryLabel,btn("Inserir","add-library-flow",""));
    container.append(libraryRow);
  }

  if(!flows.length){
    const empty=el("div","nexus-interaction-empty-state");
    empty.append(el("strong","","Nenhum fluxo neste componente"),el("p","","Adicione um fluxo para definir as interações deste componente."),btn("＋ Criar fluxo","add-flow",""));
    container.append(empty);
    return;
  }

  const flowTabs=el("nav","nexus-interaction-flow-tabs");
  flowTabs.setAttribute("role","tablist");
  flowTabs.setAttribute("aria-label","Fluxos do componente");
  for(const flow of flows){
    const tab=el("button","nexus-interaction-flow-tab",flow.name||"Novo fluxo");
    tab.type="button";
    tab.setAttribute("data-interaction-flow-tab",flow.id);
    tab.setAttribute("role","tab");
    tab.setAttribute("aria-selected",String(flow.id===activeFlowId));
    tab.classList.toggle("active",flow.id===activeFlowId);
    flowTabs.append(tab);
  }
  container.append(flowTabs);

  const flowList=el("div","nexus-interaction-flows");
  for(const flow of flows){
    const card=el("section","nexus-interaction-flow");
    card.dataset.interactionId=flow.id;
    card.setAttribute("data-interaction-flow-panel",flow.id);
    card.hidden=flow.id!==activeFlowId;
    card.setAttribute("role","tabpanel");

    const top=el("div","nexus-interaction-flow-heading");
    const name=field("input","Nome",flow.name);bind(name.input,"flow",flow.id,"name");top.append(name.wrap);
    const enabled=field("input","Ativo",flow.enabled);enabled.input.type="checkbox";bind(enabled.input,"flow",flow.id,"enabled");
    const flowActions=el("div","nexus-interaction-flow-actions");
    flowActions.append(enabled.wrap,iconBtn("Salvar na biblioteca","fa-bookmark","save-flow",flow.id),iconBtn("Excluir fluxo","fa-trash","remove-flow",flow.id));
    top.append(flowActions);
    card.append(top);

    const guided=el("section","nexus-interaction-guided");
    const triggers=el("section","nexus-interaction-group");
    const triggerHeading=el("div","nexus-interaction-group-heading");
    triggerHeading.append(el("h6","","Gatilhos"),btn("＋ Adicionar","add-trigger",flow.id));
    triggers.append(triggerHeading);
    flow.triggers.forEach((tr,i)=>{
      const row=el("div","nexus-interaction-row");
      const sel=field("select","Evento",tr.event,events);
      bind(sel.input,"trigger",flow.id,"event",{triggerIndex:i});
      row.append(sel.wrap,iconBtn("Remover gatilho","fa-trash","remove-trigger",flow.id,{triggerIndex:i}));
      triggers.append(row);
    });

    const conditions=el("section","nexus-interaction-group");
    const conditionHeading=el("div","nexus-interaction-group-heading nexus-interaction-condition-heading");
    const join=field("select","Combinar condições",flow.conditionJoin,[["all","Todas (E)"],["any","Qualquer (OU)"]]);
    bind(join.input,"flow",flow.id,"conditionJoin");
    conditionHeading.append(el("h6","","Condições"),join.wrap,btn("＋ Adicionar","add-condition",flow.id));
    conditions.append(conditionHeading);
    flow.conditions.forEach((co,i)=>{
      const row=el("div","nexus-interaction-condition");
      for(const [label,key,val,opts] of [["Propriedade","path",co.path],["Operador","operator",co.operator,operators],["Valor","value",co.value]]){
        const fieldControl=field(opts?"select":"input",label,val,opts);
        bind(fieldControl.input,"condition",flow.id,key,{conditionIndex:i});
        row.append(fieldControl.wrap);
      }
      row.append(iconBtn("Remover condição","fa-trash","remove-condition",flow.id,{conditionIndex:i}));
      conditions.append(row);
    });
    guided.append(triggers,conditions);
    card.append(guided);

    const acts=el("section","nexus-interaction-group nexus-interaction-actions");
    const actionsHeading=el("div","nexus-interaction-group-heading");
    actionsHeading.append(el("h6","","Ações"),btn("＋ Adicionar ação","add-action",flow.id));
    acts.append(actionsHeading);
    flow.actions.forEach((a,i)=>{
      const row=el("details","nexus-interaction-action");row.open=true;
      const actionName=(a.type==="roll"&&a.config.mode==="skill"?"Rolagem de perícia":actions.find(([key])=>key===a.type)?.[1]??"Ação")+" · "+(i+1);
      const actionTitle=el("summary","nexus-interaction-action-title");
      actionTitle.append(el("span","nexus-interaction-action-name",actionName));
      const tools=el("div","nexus-interaction-action-tools");
      const moveUp=iconBtn("Mover ação para cima","fa-arrow-up","move-action",flow.id,{actionIndex:i,direction:-1});
      const moveDown=iconBtn("Mover ação para baixo","fa-arrow-down","move-action",flow.id,{actionIndex:i,direction:1});
      moveUp.disabled=i===0;moveDown.disabled=i===flow.actions.length-1;
      tools.append(moveUp,moveDown,iconBtn("Remover ação","fa-trash","remove-action",flow.id,{actionIndex:i}));
      const meta=el("div","nexus-interaction-action-meta");
      const type=field("select","Tipo",a.type,actions);bind(type.input,"action",flow.id,"type",{actionIndex:i});meta.append(type.wrap);
      const active=field("input","Ativo",a.enabled);active.input.type="checkbox";active.input.checked=a.enabled!==false;bind(active.input,"action",flow.id,"enabled",{actionIndex:i});meta.append(active.wrap);
      const config=el("div","nexus-interaction-action-config");
      actionConfig(config,{...flow,componentId:component.id},a,i,components);
      row.append(actionTitle,tools,meta,config);
      acts.append(row);
    });
    card.append(acts);

    const advanced=el("details","nexus-interaction-execution");
    const advancedSummary=el("summary","","Execução avançada");
    const error=field("select","Se uma ação falhar",flow.execution.onError,[["stop","Interromper o fluxo"],["continue","Continuar próximas ações"]]);
    bind(error.input,"flow",flow.id,"onError");
    advanced.append(advancedSummary,error.wrap);
    card.append(advanced);
    flowList.append(card);
  }
  container.append(flowList);
}
