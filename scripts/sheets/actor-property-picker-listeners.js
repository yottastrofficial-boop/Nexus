/**
 * Property path autocomplete and picker portal for the Actor sheet.
 * Owns only picker UI and event bindings; property catalog data is injected.
 */
export function activateActorPropertyPickerListeners(sheet, inspectorNamespace, dependencies) {
  const {
    collectPropertyPaths,
    getNativePropertyDefinitions,
    getAliasDefinitions,
    safeAliasKey,
    getNexusRollAliasEntries,
    buildPropertyPickerCatalog,
    renderPropertyPicker
  } = dependencies;

const propertyPickerId=`nexus-property-picker-${String(sheet.id).replace(/[^a-zA-Z0-9_-]/g,"")}`;
const getPropertyOptionsOwner=input=>input?.closest(".nexus-panel-window, .nexus-library-panel, .nexus-component-inspector, .nexus-behavior-editor");
const ensurePropertyOptionsList=()=>{
  let list=document.getElementById(propertyPickerId);
  if(!list){
    list=document.createElement("div");list.className="nexus-property-options";list.id=propertyPickerId;list.dataset.componentPathOptions="";list.dataset.nexusPropertyOwner=String(sheet.id);list.hidden=true;
    list.setAttribute("role","listbox");list.setAttribute("aria-label","Propriedades disponíveis");document.body.append(list);
  }
  return list;
};
const positionPropertyOptions=input=>{
  if(!input?.isConnected)return;
  const list=ensurePropertyOptionsList(),owner=getPropertyOptionsOwner(input);if(!owner||list.hidden)return;
  list._nexusOwnerInspector=owner;list._nexusOwnerInput=input;
  const rect=input.getBoundingClientRect(),vw=document.documentElement.clientWidth||window.innerWidth,vh=document.documentElement.clientHeight||window.innerHeight,gap=6;
  const width=Math.min(Math.max(280,rect.width),Math.min(520,vw-24));
  const above=Math.max(0,rect.top-gap-12),below=Math.max(0,vh-rect.bottom-gap-12),placeAbove=above>below&&above>140;
  const maxHeight=Math.max(112,Math.min(340,placeAbove?above:below));
  list.style.position="fixed";list.style.left=`${Math.max(12,Math.min(rect.left,vw-width-12))}px`;list.style.width=`${width}px`;
  list.style.maxHeight=`${maxHeight}px`;list.style.top=placeAbove?`${Math.max(8,rect.top-Math.min(list.scrollHeight||240,maxHeight)-gap)}px`:`${Math.min(vh-maxHeight-8,rect.bottom+gap)}px`;
  list.style.bottom="auto";list.style.overflowY="auto";
};
const filterPropertyOptions=input=>{
  const list=ensurePropertyOptionsList(),owner=getPropertyOptionsOwner(input);if(!owner)return;
  if(list._nexusOwnerInput!==input)list.dataset.categoryPath="";
  list._nexusOwnerInput=input;list._nexusOwnerInspector=owner;
  const paths=new Set(["name",...collectPropertyPaths(sheet.actor)]);
  for(const alias of [...getNativePropertyDefinitions(sheet.actor),...getAliasDefinitions(sheet.actor)]){
    const root=safeAliasKey(alias.key);if(!root)continue;
    const suffixes=alias.type==="attribute"?["checkbonus","roll"]:alias.type==="resource"?["value","max","percentage"]:[ "" ];
    for(const suffix of suffixes)paths.add(suffix?`${root}.${suffix}`:root);
  }
  const nativeProperties=getNativePropertyDefinitions(sheet.actor),aliases=getAliasDefinitions(sheet.actor),rollAliases=getNexusRollAliasEntries(sheet.actor);
  const signature=JSON.stringify({paths:[...paths].sort(),native:nativeProperties.map(item=>[item.id,item.key,item.label]),aliases:aliases.map(item=>[item.key,item.label,item.targetPath]),rollAliases:rollAliases.map(entry=>[entry.target,entry.display,entry.label])});
  if(list.dataset.optionsSignature!==signature){
    list._nexusCatalog=buildPropertyPickerCatalog({paths:[...paths],nativeProperties,aliases,rollAliases});
    list.dataset.optionsSignature=signature;
  }
  const formulaMode=input.hasAttribute("data-roll-formula-input");
  const propertyMode=input.hasAttribute("data-component-path-input")||input.hasAttribute("data-interaction-property-input");
  const raw=String(input.value??""),cursor=input.selectionStart??raw.length,before=raw.slice(0,cursor);
  const formulaAt=formulaMode?before.match(/@([A-Za-z0-9_.-]*)$/):null;
  const formulaExpression=formulaMode?before.match(/\{\{\s*([A-Za-z0-9_.-]*)$/):null;
  const templateExpression=!formulaMode&&!propertyMode?before.match(/\{\{\s*([A-Za-z0-9_.-]*)$/):null;
  if((formulaMode&&!formulaAt&&!formulaExpression)||(!formulaMode&&!propertyMode&&!templateExpression)){list.hidden=true;return;}
  const query=(formulaAt?.[1]??formulaExpression?.[1]??templateExpression?.[1]??(propertyMode?raw:"")).trim();
  list._nexusQuery=query;list._nexusFormulaMode=formulaMode;
  renderPropertyPicker(list,list._nexusCatalog,{
    categoryPath:list.dataset.categoryPath??"",
    query,
    formulaMode
  });
  list.hidden=false;requestAnimationFrame(()=>positionPropertyOptions(input));
};
const propertyInputSelector=".nexus-panel-window [data-component-path-input], .nexus-panel-window [data-interaction-property-input], .nexus-panel-window [data-roll-formula-input], .nexus-library-panel [data-component-path-input], .nexus-library-panel [data-interaction-property-input], .nexus-library-panel [data-roll-formula-input]";
const templateInputSelector=".nexus-panel-window input[type='text']:not([data-component-path-input]):not([data-interaction-property-input]):not([data-roll-formula-input]), .nexus-panel-window input[type='search']:not([data-library-search]), .nexus-panel-window textarea, .nexus-library-panel input[type='text']:not([data-component-path-input]):not([data-interaction-property-input]):not([data-roll-formula-input]), .nexus-library-panel textarea";
$(document).on(`focusin${inspectorNamespace}`,propertyInputSelector+", "+templateInputSelector,event=>filterPropertyOptions(event.currentTarget));
$(document).on(`input${inspectorNamespace}`,propertyInputSelector+", "+templateInputSelector,event=>filterPropertyOptions(event.currentTarget));
$(window).on(`resize${inspectorNamespace} scroll${inspectorNamespace}`,()=>{const input=document.activeElement?.matches?.(propertyInputSelector+", "+templateInputSelector)?document.activeElement:null;if(input)positionPropertyOptions(input);});
$(document).on(`pointerdown${inspectorNamespace}`,"[data-property-category], [data-property-back], [data-property-path-option]",event=>{
  // Keep focus on the source field; focusout would otherwise close the portal
  // before the category can be opened or an option can be selected.
  event.preventDefault();
  event.stopPropagation();
});
$(document).on(`click${inspectorNamespace}`,"[data-property-category]",event=>{
  event.preventDefault();event.stopPropagation();
  const list=event.currentTarget.closest("[data-component-path-options]"),input=list?._nexusOwnerInput;
  if(!list||!list._nexusCatalog)return;
  list.dataset.categoryPath=event.currentTarget.dataset.propertyCategory??"";
  renderPropertyPicker(list,list._nexusCatalog,{categoryPath:list.dataset.categoryPath,query:"",formulaMode:!!list._nexusFormulaMode});
  if(input?.isConnected)positionPropertyOptions(input);
});
$(document).on(`click${inspectorNamespace}`,"[data-property-back]",event=>{
  event.preventDefault();event.stopPropagation();
  const list=event.currentTarget.closest("[data-component-path-options]"),input=list?._nexusOwnerInput;
  if(!list||!list._nexusCatalog)return;
  list.dataset.categoryPath=String(list.dataset.categoryPath??"").split(".").slice(0,-1).join(".");
  renderPropertyPicker(list,list._nexusCatalog,{categoryPath:list.dataset.categoryPath,query:"",formulaMode:!!list._nexusFormulaMode});
  if(input?.isConnected)positionPropertyOptions(input);
});
$(document).on(`click${inspectorNamespace}`,"[data-property-path-option]",event=>{
  event.preventDefault();event.stopPropagation();
  const button=event.currentTarget,list=button.closest("[data-component-path-options]"),input=list?._nexusOwnerInput;
  if(!input||!list)return;
  const value=input.value,cursor=input.selectionStart??value.length,before=value.slice(0,cursor);
  const formulaMode=input.hasAttribute("data-roll-formula-input");
  const propertyMode=input.hasAttribute("data-component-path-input")||input.hasAttribute("data-interaction-property-input");
  const atMatch=formulaMode?before.match(/@([A-Za-z0-9_.-]*)$/):null;
  const braceMatch=before.match(/\{\{\s*([A-Za-z0-9_.-]*)$/);
  let start=cursor,end=cursor,token=button.dataset.propertyPathOption;
  if(propertyMode){start=0;end=value.length;}
  else if(formulaMode&&atMatch){start=cursor-atMatch[0].length;while(end<value.length&&/[A-Za-z0-9_.-]/.test(value[end]))end++;token=button.dataset.rollToken||"@"+token;}
  else if(braceMatch){start=cursor-braceMatch[0].length;while(end<value.length&&/[A-Za-z0-9_.-]/.test(value[end]))end++;if(value.slice(end,end+2)==="}}")end+=2;token="{{"+token+"}}";}
  else if(formulaMode)return;
  input.value=value.slice(0,start)+token+value.slice(end);
  input.focus({preventScroll:true});
  if(typeof input.setSelectionRange==="function")input.setSelectionRange(start+token.length,start+token.length);
  input.dispatchEvent(new Event("input",{bubbles:true}));
  input.dispatchEvent(new Event("change",{bubbles:true}));
  list.hidden=true;list.dataset.categoryPath="";
});
$(document).on(`pointerdown${inspectorNamespace}`,"[data-component-path-options]",event=>event.stopPropagation());
$(document).on(`scroll${inspectorNamespace}`,".nexus-panel-window, .nexus-component-inspector",()=>{const list=document.getElementById(propertyPickerId),input=list?._nexusOwnerInput;if(input?.isConnected)positionPropertyOptions(input);});
$(document).on(`focusout${inspectorNamespace}`,propertyInputSelector+", "+templateInputSelector,event=>{
  const input=event.currentTarget,list=document.getElementById(propertyPickerId);
  requestAnimationFrame(()=>{if(list&&!list.contains(document.activeElement)&&document.activeElement!==input){list.hidden=true;list.dataset.categoryPath="";list.style.top="";list.style.left="";list.style.width="";list._nexusOwnerInput=null;list._nexusOwnerInspector=null;}});
});

}
