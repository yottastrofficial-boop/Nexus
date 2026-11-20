import { buildGroupHierarchy } from "./group-hierarchy.js";
export const GROUP_LAYOUT_MODES=Object.freeze(["free","horizontal","vertical","grid"]);
export const GROUP_KINDS=Object.freeze(["folder","container","section"]);
export function normalizeGroupPresentation(group={}) {
 const kind=GROUP_KINDS.includes(group.kind)?group.kind:"container";
 return {...group,kind,layoutMode:GROUP_LAYOUT_MODES.includes(group.layoutMode)?group.layoutMode:"free",
 gap:group.gap===undefined?8:Math.min(120,Math.max(0,Number(group.gap)||0)),padding:group.padding===undefined?8:Math.min(120,Math.max(0,Number(group.padding)||0)),
 columns:Math.min(12,Math.max(1,Math.trunc(Number(group.columns)||2))),
 align:["start","center","end"].includes(group.align)?group.align:"start",
 showHeader:group.showHeader===undefined?kind==="section":group.showHeader===true,
 title:String(group.title??group.name??"Grupo").slice(0,48)};
}
const getBounds=(ids,map)=>{const items=ids.map(id=>map.get(String(id))).filter(Boolean);if(!items.length)return null;const x=Math.min(...items.map(c=>Number(c.x)||0)),y=Math.min(...items.map(c=>Number(c.y)||0));return {x,y,w:Math.max(...items.map(c=>(Number(c.x)||0)+(Number(c.w)||0)))-x,h:Math.max(...items.map(c=>(Number(c.y)||0)+(Number(c.h)||0)))-y};};
export function applyGroupLayouts(groups=[],components=[]) {
 const nextGroups=(Array.isArray(groups)?groups:[]).map(normalizeGroupPresentation),nextComponents=(Array.isArray(components)?components:[]).map(c=>({...c}));
 const tree=buildGroupHierarchy(nextGroups,nextComponents),map=new Map(nextComponents.map(c=>[String(c.id),c]));
 const depth=id=>{let n=0,cursor=tree.parentById.get(String(id))||"",seen=new Set([String(id)]);while(cursor&&!seen.has(cursor)){seen.add(cursor);n++;cursor=tree.parentById.get(cursor)||"";}return n;};
 for(const group of [...nextGroups].sort((a,b)=>depth(b.id)-depth(a.id))){
  if(group.layoutMode==="free")continue;
  const direct=tree.directComponents.get(String(group.id))||[],children=tree.children.get(String(group.id))||[];
  const items=[...direct.map(id=>({type:"component",id,bounds:(()=>{const c=map.get(id);return c?{x:c.x,y:c.y,w:c.w,h:c.h}:null;})()})),...children.map(id=>({type:"group",id,bounds:getBounds(tree.descendants.get(id)||[],map)}))].filter(i=>i.bounds);
  if(!items.length)continue;
  const gap=group.gap,pad=group.padding,head=group.showHeader?28:0;
  group.layoutOrigin??={x:Math.min(...items.map(i=>i.bounds.x)),y:Math.min(...items.map(i=>i.bounds.y))};
  const sx=(Number(group.layoutOrigin.x)||0)+pad,sy=(Number(group.layoutOrigin.y)||0)+pad+head;
  const move=(item,x,y)=>{const dx=x-item.bounds.x,dy=y-item.bounds.y,ids=item.type==="component"?[item.id]:(tree.descendants.get(item.id)||[]);for(const id of ids){const c=map.get(String(id));if(c){c.x=Math.round((Number(c.x)||0)+dx);c.y=Math.round((Number(c.y)||0)+dy);}}item.bounds={...item.bounds,x,y};};
  if(group.layoutMode==="horizontal"){const mh=Math.max(...items.map(i=>i.bounds.h));let x=sx;for(const i of items){move(i,x,sy+(group.align==="center"?(mh-i.bounds.h)/2:group.align==="end"?mh-i.bounds.h:0));x+=i.bounds.w+gap;}}
  else if(group.layoutMode==="vertical"){const mw=Math.max(...items.map(i=>i.bounds.w));let y=sy;for(const i of items){move(i,sx+(group.align==="center"?(mw-i.bounds.w)/2:group.align==="end"?mw-i.bounds.w:0),y);y+=i.bounds.h+gap;}}
  else {const cols=Math.min(group.columns,items.length),rows=Math.ceil(items.length/cols),widths=Array.from({length:cols},(_,col)=>Math.max(...items.filter((_,i)=>i%cols===col).map(i=>i.bounds.w))),heights=Array.from({length:rows},(_,row)=>Math.max(...items.slice(row*cols,(row+1)*cols).map(i=>i.bounds.h))),xs=[],ys=[];let x=sx,y=sy;for(let col=0;col<cols;col++){xs[col]=x;x+=widths[col]+gap;}for(let row=0;row<rows;row++){ys[row]=y;y+=heights[row]+gap;}items.forEach((i,index)=>{const col=index%cols,row=Math.floor(index/cols);move(i,xs[col]+(group.align==="center"?(widths[col]-i.bounds.w)/2:group.align==="end"?widths[col]-i.bounds.w:0),ys[row]+(group.align==="center"?(heights[row]-i.bounds.h)/2:group.align==="end"?heights[row]-i.bounds.h:0));});}
 }
 return {groups:nextGroups,components:nextComponents};
}