/** Canonical interaction state for a NEXUS actor sheet. */
const asId = value => String(value ?? "").trim();
export function createSheetInteractionState({ getComponents = () => [], getGroups = () => [] } = {}) {
 let selectedIds=new Set(),selectedGroupId=null,inspectorTargetId=null,activePanelKey=null,revision=0;
 const componentIds=()=>new Set((getComponents()??[]).map(x=>asId(x?.id)).filter(Boolean));
 const groupIds=()=>new Set((getGroups()??[]).map(x=>asId(x?.id)).filter(Boolean));
 const normalize=value=>{const src=value instanceof Set?[...value]:Array.isArray(value)?value:value==null?[]:[value],valid=componentIds();return [...new Set(src.map(asId).filter(id=>id&&valid.has(id)))];};
 const snapshot=()=>Object.freeze({selectedIds:[...selectedIds],selectedGroupId,inspectorTargetId,activePanelKey,revision});
 const api={
  get selectedIds(){return new Set(selectedIds);},set selectedIds(value){selectedIds=new Set(normalize(value));inspectorTargetId=selectedIds.size===1?[...selectedIds][0]:null;if(selectedGroupId&&!groupIds().has(selectedGroupId))selectedGroupId=null;revision++;},
  get selectedGroupId(){return selectedGroupId;},set selectedGroupId(value){const id=asId(value);selectedGroupId=id&&groupIds().has(id)?id:null;revision++;},
  get inspectorTargetId(){return inspectorTargetId;},set inspectorTargetId(value){const valid=componentIds();if(selectedIds.size===1)inspectorTargetId=[...selectedIds][0];else if(selectedIds.size>1)inspectorTargetId=null;else{const id=asId(value);inspectorTargetId=id&&valid.has(id)?id:null;}revision++;},
  get activePanelKey(){return activePanelKey;},set activePanelKey(value){activePanelKey=asId(value)||null;revision++;},get revision(){return revision;},
  setSelection(ids,{groupId=null,targetId=undefined}={}){selectedIds=new Set(normalize(ids));const group=asId(groupId);selectedGroupId=group&&groupIds().has(group)?group:null;if(selectedIds.size===1)inspectorTargetId=[...selectedIds][0];else if(selectedIds.size>1)inspectorTargetId=null;else{const target=asId(targetId);inspectorTargetId=target&&componentIds().has(target)?target:null;}revision++;return snapshot();},
  setActivePanel(key){api.activePanelKey=key;return snapshot();},
  reconcile(){selectedIds=new Set(normalize(selectedIds));if(selectedGroupId&&!groupIds().has(selectedGroupId))selectedGroupId=null;const valid=componentIds();if(selectedIds.size===1)inspectorTargetId=[...selectedIds][0];else if(selectedIds.size>1||(inspectorTargetId&&!valid.has(inspectorTargetId)))inspectorTargetId=null;revision++;return snapshot();},
  snapshot,clear(){selectedIds.clear();selectedGroupId=null;inspectorTargetId=null;activePanelKey=null;revision++;return snapshot();}
 };return Object.freeze(api);
}
