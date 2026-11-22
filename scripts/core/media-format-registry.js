/**
 * Registry de formatos e adaptadores de mídia do NEXUS.
 * Identifica arquivos e organiza adaptadores; não decodifica por conta própria.
 * Binários pesados são carregados sob demanda, nunca implicitamente por CDN.
 */
const DEFAULT_FORMATS = [
  {id:"jpeg-xl",label:"JPEG XL",kind:"image",extensions:["jxl"],mimeTypes:["image/jxl"],codecs:["jxl"],containers:["jxl"],decoder:"libjxl-wasm",foundryUpload:false},
  {id:"av1",label:"AV1",kind:"video",extensions:[],mimeTypes:["video/av1"],codecs:["av1"],containers:["webm","mp4"],decoder:"ffmpeg-wasm",foundryUpload:true},
  {id:"opus",label:"Opus",kind:"audio",extensions:["opus"],mimeTypes:["audio/opus"],codecs:["opus"],containers:["ogg","webm"],decoder:"ffmpeg-wasm",foundryUpload:true},
  {id:"avif",label:"AVIF",kind:"image",extensions:["avif"],mimeTypes:["image/avif"],codecs:["av1","avif"],containers:["avif"],decoder:"browser-or-wasm",foundryUpload:true},
  {id:"webp",label:"WebP",kind:"image",extensions:["webp"],mimeTypes:["image/webp"],codecs:["webp"],containers:["riff-webp"],decoder:"browser",foundryUpload:true},
  {id:"png",label:"PNG",kind:"image",extensions:["png"],mimeTypes:["image/png"],codecs:["png"],containers:["png"],decoder:"browser",foundryUpload:true},
  {id:"jpeg",label:"JPEG",kind:"image",extensions:["jpg","jpeg"],mimeTypes:["image/jpeg"],codecs:["jpeg"],containers:["jpeg"],decoder:"browser",foundryUpload:true},
  {id:"gif",label:"GIF",kind:"image",extensions:["gif"],mimeTypes:["image/gif"],codecs:["gif"],containers:["gif"],decoder:"browser",foundryUpload:true},
  {id:"webm",label:"WebM",kind:"video",extensions:["webm"],mimeTypes:["video/webm","audio/webm"],codecs:["vp8","vp9","av1","opus"],containers:["webm"],decoder:"browser-or-ffmpeg-wasm",foundryUpload:true},
  {id:"mp4",label:"MP4",kind:"video",extensions:["mp4","m4v"],mimeTypes:["video/mp4","audio/mp4"],codecs:["h264","hevc","av1","aac","opus"],containers:["mp4"],decoder:"browser-or-ffmpeg-wasm",foundryUpload:true},
  {id:"ogg",label:"Ogg",kind:"audio",extensions:["ogg","oga","ogv"],mimeTypes:["audio/ogg","video/ogg"],codecs:["opus","vorbis","theora"],containers:["ogg"],decoder:"browser-or-ffmpeg-wasm",foundryUpload:true},
  {id:"wav",label:"WAV",kind:"audio",extensions:["wav"],mimeTypes:["audio/wav","audio/x-wav"],codecs:["pcm"],containers:["riff-wave"],decoder:"browser-or-ffmpeg-wasm",foundryUpload:true},
  {id:"pdf",label:"PDF",kind:"document",extensions:["pdf"],mimeTypes:["application/pdf"],codecs:[],containers:["pdf"],decoder:"pdf-viewer",foundryUpload:true}
];
const ascii=(b,s,e)=>String.fromCharCode(...b.slice(s,e));
const bytesOf=v=>v instanceof Uint8Array?v:v instanceof ArrayBuffer?new Uint8Array(v):ArrayBuffer.isView(v)?new Uint8Array(v.buffer,v.byteOffset,v.byteLength):Array.isArray(v)?Uint8Array.from(v):new Uint8Array();
const extensionOf=v=>{const s=String(v??"").trim().toLowerCase().split(/[?#]/,1)[0],b=s.slice(s.lastIndexOf("/")+1),i=b.lastIndexOf(".");return i>=0?b.slice(i+1):b.replace(/^\./,"");};
const mimeOf=v=>String(v??"").split(";",1)[0].trim().toLowerCase();
function normalizeFormat(f){
  if(!f||typeof f!=="object")throw new TypeError("Definição de formato inválida.");
  const id=String(f.id??"").trim().toLowerCase(),kind=String(f.kind??"").trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9-]*$/.test(id))throw new TypeError("ID de formato inválido.");
  if(!["image","video","audio","document","font","model","archive","other"].includes(kind))throw new TypeError("Tipo de mídia inválido.");
  return Object.freeze({...f,id,kind,
    extensions:[...new Set((f.extensions??[]).map(extensionOf).filter(Boolean))],
    mimeTypes:[...new Set((f.mimeTypes??[]).map(mimeOf).filter(Boolean))],
    codecs:[...new Set((f.codecs??[]).map(x=>String(x).toLowerCase()))],
    containers:[...new Set((f.containers??[]).map(x=>String(x).toLowerCase()))]});
}
export function createMediaFormatRegistry({formats=DEFAULT_FORMATS}={}){
  const byId=new Map(),adapters=new Map();
  const registerFormat=f=>{const n=normalizeFormat(f);if(byId.has(n.id))throw new Error("Formato já registrado: "+n.id);byId.set(n.id,n);return n;};
  const registerAdapter=a=>{
    if(!a||typeof a!=="object"||!/^[a-z0-9][a-z0-9._-]*$/i.test(String(a.id??"")))throw new TypeError("Adaptador inválido.");
    if(adapters.has(a.id))throw new Error("Adaptador já registrado: "+a.id);
    if(typeof a.load!=="function")throw new TypeError("O adaptador precisa fornecer load().");
    const n=Object.freeze({...a,formats:[...(a.formats??[])],codecs:[...(a.codecs??[])]});adapters.set(n.id,n);return n;
  };
  for(const f of formats)registerFormat(f);
  const listFormats=kind=>[...byId.values()].filter(f=>!kind||f.kind===kind);
  const getFormat=id=>byId.get(String(id??"").toLowerCase())??null;
  const findByExtension=v=>listFormats().find(f=>f.extensions.includes(extensionOf(v)))??null;
  const findByMimeType=v=>listFormats().find(f=>f.mimeTypes.includes(mimeOf(v)))??null;
  const findAdapters=({format,codec,capability}={})=>[...adapters.values()].filter(a=>
    (!format||!a.formats.length||a.formats.includes(format))&&(!codec||!a.codecs.length||a.codecs.includes(String(codec).toLowerCase()))&&
    (typeof a.supports!=="function"||a.supports({format,codec,capability})!==false));
  return Object.freeze({registerFormat,registerAdapter,listFormats,getFormat,findByExtension,findByMimeType,findAdapters});
}
export function sniffMediaSignature(input){
  const b=bytesOf(input);if(!b.length)return null;
  const sig=[
    ["jpeg-xl",((b.length>=2&&b[0]===255&&b[1]===10)||(b.length>=12&&ascii(b,4,8)==="JXL "&&b[8]===13&&b[9]===10&&b[10]===135&&b[11]===10)),"jxl"],
    ["png",b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v),"png"],
    ["jpeg",b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255,"jpeg"],
    ["gif",b.length>=6&&/^GIF8[79]a$/.test(ascii(b,0,6)),"gif"],
    ["webp",b.length>=12&&ascii(b,0,4)==="RIFF"&&ascii(b,8,12)==="WEBP","riff-webp"],
    ["wav",b.length>=12&&ascii(b,0,4)==="RIFF"&&ascii(b,8,12)==="WAVE","riff-wave"],
    ["webm",b.length>=4&&b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163,"webm"],
    ["ogg",b.length>=4&&ascii(b,0,4)==="OggS","ogg"],
    ["mp4",b.length>=12&&ascii(b,4,8)==="ftyp","mp4"],
    ["pdf",b.length>=5&&ascii(b,0,5)==="%PDF-","pdf"]
  ];
  const hit=sig.find(x=>x[1]);return hit?Object.freeze({formatId:hit[0],container:hit[2],confidence:"signature"}):null;
}
/** Codec AV1 em WebM/MP4 exige inspeção da faixa; extensão não é prova. */
export function detectMediaDescriptor({name="",mimeType="",bytes=null,codec=""}={},registry=createMediaFormatRegistry()){
  const extension=extensionOf(name),mime=mimeOf(mimeType),signature=sniffMediaSignature(bytes);
  const format=(signature&&registry.getFormat(signature.formatId))||registry.findByExtension(extension)||registry.findByMimeType(mime);
  if(!format)return Object.freeze({supported:false,kind:"other",formatId:null,extension,mimeType:mime,codec:String(codec??"").toLowerCase()||null,container:signature?.container??null,confidence:signature?"signature-unmapped":"unknown"});
  return Object.freeze({supported:true,kind:format.kind,formatId:format.id,label:format.label,extension,mimeType:mime||format.mimeTypes[0]||"",
    codec:String(codec??"").trim().toLowerCase()||(format.codecs.length===1?format.codecs[0]:null),container:signature?.container??format.containers[0]??null,
    confidence:signature?"signature":registry.findByExtension(extension)?"extension":"mime",foundryUpload:format.foundryUpload===true,decoder:format.decoder??null});
}
export const NEXUS_MEDIA_FORMATS=Object.freeze(DEFAULT_FORMATS.map(normalizeFormat));
