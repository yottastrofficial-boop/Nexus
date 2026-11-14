export function renderActorSheetRichMedia(sheet, root, { resolveNexusBinding, isMediaSource, COMPONENTS } = {}) {

    const safeUrl = value => { try { const url = new URL(value, window.location.href); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch (_) { return ""; } };
    const createMedia = (value, label = "", forceImage = false, displayMode = "auto") => {
      const safe = safeUrl(value); if (!safe || displayMode === "text") return null;
      const clean = safe.split(/[?#]/)[0].toLowerCase();
      const image = displayMode === "image" || (displayMode === "auto" && (forceImage || /\.(?:png|jpe?g|jpe|jfif|pjpeg|pjp|gif|apng|webp|avif|svg|bmp|dib|tif|tiff|ico|heic|heif|jxl)$/.test(clean) || /^data:image\//i.test(safe)));
      const audio = displayMode === "audio" || (displayMode === "auto" && (/\.(?:mp3|ogg|wav|m4a|aac|flac|opus)$/.test(clean) || /^data:audio\//i.test(safe)));
      const video = displayMode === "video" || (displayMode === "auto" && (/\.(?:mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp)$/.test(clean) || /^data:video\//i.test(safe)));
      if (image) { const n=document.createElement("img"); n.src=safe; n.alt=label||"Mídia incorporada"; n.loading="lazy"; n.className="nexus-rich-image nexus-adaptive-image"; return n; }
      if (audio) { const n=document.createElement("audio"); n.src=safe; n.controls=true; n.preload="none"; n.className="nexus-rich-audio nexus-adaptive-audio"; return n; }
      if (video) { const n=document.createElement("video"); n.src=safe; n.controls=true; n.preload="metadata"; n.className="nexus-rich-video nexus-adaptive-video"; return n; }
      const a=document.createElement("a"); a.href=safe; a.target="_blank"; a.rel="noopener noreferrer"; a.textContent=label||value; a.className="nexus-rich-link"; return a;
    };
    const renderExpressionText = (node, allowPlainUrls = false) => {
      if (!node || node.dataset.richRendered === "true") return;
      const source=node.textContent??"";
      const pattern=allowPlainUrls ? /\{\{\s*([^{}]+?)\s*\}\}|https?:\/\/[^\s<>]+/gi : /\{\{\s*([^{}]+?)\s*\}\}/gi;
      if (!pattern.test(source)) return;
      pattern.lastIndex=0; node.replaceChildren(); node.dataset.richRendered="true";
      let cursor=0,match;
      while ((match=pattern.exec(source))) {
        if(match.index>cursor) node.append(document.createTextNode(source.slice(cursor,match.index)));
        const wrapped=match[1]!==undefined, token=(match[1]??match[0]).replace(/[),.!?;]+$/,"").trim();
        let resolved=token, forceImage=false;
        if (wrapped && !/^https?:\/\//i.test(token)) {
          const binding=resolveNexusBinding(sheet.actor,token);
          resolved=binding.value == null ? "" : String(binding.value);
          forceImage=binding.path==="img" || /\.(?:img|image|portrait|avatar|token)$/i.test(binding.path||token) || binding.alias?.type==="image";
        }
        const explicitUrl=wrapped && /^https?:\/\//i.test(token);
        const resolvedIsMedia=wrapped && !explicitUrl && isMediaSource(resolved);
        const media=explicitUrl ? createMedia(token,token,false,"link") : resolvedIsMedia ? createMedia(resolved,token,forceImage) : (!wrapped ? createMedia(token,token,false,"link") : null);
        node.append(media ?? document.createTextNode(wrapped ? (resolved || match[0]) : match[0]));
        cursor=pattern.lastIndex;
      }
      if(cursor<source.length) node.append(document.createTextNode(source.slice(cursor)));
    };
    root.querySelectorAll(".nexus-asset-text").forEach(node => {
      const card=node.closest(".nexus-component"), component=(sheet._currentLayout?.components??[]).find(item=>item.id===card?.dataset.id);
      renderExpressionText(node,!component?.dataPath);
    });
    root.querySelectorAll(".nexus-component-content, .nexus-component-heading").forEach(container => {
      const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT); const nodes=[];
      while(walker.nextNode()) if(/\{\{[^{}]+\}\}/.test(walker.currentNode.textContent??"")) nodes.push(walker.currentNode);
      for(const textNode of nodes){const wrapper=document.createElement("span");textNode.replaceWith(wrapper);wrapper.append(document.createTextNode(textNode.textContent));renderExpressionText(wrapper,false);}
    });
    sheet._renderAdaptiveContent(root, createMedia);
}

export function renderActorSheetAdaptiveContent(sheet, root, createMedia, { resolveNexusBinding, isMediaSource, COMPONENTS } = {}) {

    if (!root) return;
    const renderMedia = createMedia ?? ((value, label, forceImage, displayMode = "auto") => {
      const safe = (() => { try { const url = new URL(value, window.location.href); return ["http:","https:"].includes(url.protocol) ? url.href : ""; } catch (_) { return ""; } })();
      if (!safe || displayMode === "text") return null;
      const clean=safe.split(/[?#]/)[0].toLowerCase();
      const image=displayMode === "image" || (displayMode === "auto" && (forceImage || /\.(?:png|jpe?g|jpe|jfif|pjpeg|pjp|gif|apng|webp|avif|svg|bmp|dib|tif|tiff|ico|heic|heif|jxl)$/.test(clean) || /^data:image\//i.test(safe)));
      const audio=displayMode === "audio" || (displayMode === "auto" && (/\.(?:mp3|ogg|wav|m4a|aac|flac|opus)$/.test(clean) || /^data:audio\//i.test(safe)));
      const video=displayMode === "video" || (displayMode === "auto" && (/\.(?:mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp)$/.test(clean) || /^data:video\//i.test(safe)));
      const node=document.createElement(image?"img":audio?"audio":video?"video":"a"); node.className="nexus-adaptive-media";
      if(image){node.src=safe;node.alt=label||"";node.loading="lazy";}
      else if(audio){node.src=safe;node.controls=true;node.preload="none";}
      else if(video){node.src=safe;node.controls=true;node.preload="metadata";}
      else {node.href=safe;node.target="_blank";node.rel="noopener noreferrer";node.textContent=label||value;}
      return node;
    });
    const components=sheet._currentLayout?.components ?? [];
    root.querySelectorAll(".nexus-component[data-id]").forEach(card=>{
      const component=components.find(item=>item.id===card.dataset.id); if(!component || component.type==="token" || component.type==="asset-image") return;
      const definition=COMPONENTS[component.type] ?? {};
      const rawPath=String(component.dataPath ?? definition.path ?? "").trim(); if(!rawPath) return;
      const binding=resolveNexusBinding(sheet.actor,rawPath), raw=binding.value;
      if(raw===undefined || raw===null || typeof raw==="object") return;
      const value=String(raw).trim(); if(!value || !isMediaSource(value)) return;
      const forceImage=binding.path==="img" || /\.(?:img|image|portrait|avatar|token)$/i.test(binding.path||rawPath) || binding.alias?.type==="image";
      const content=card.querySelector(".nexus-component-content"); if(!content) return;
      const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT), matches=[];
      while(walker.nextNode()){const text=walker.currentNode;if(text.parentElement?.closest("a,button,input,textarea,select,.nexus-rich-image,.nexus-adaptive-media"))continue;if(text.textContent.trim()===value)matches.push(text);}
      for(const text of matches){const media=renderMedia(value,value,forceImage,"auto");if(media){text.replaceWith(media);}}
    });
}
