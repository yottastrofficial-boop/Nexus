import { NEXUS_LIBRARY_CATALOG } from "../../assets/library/catalog.js";
import { THEME_PALETTES } from "../core/theme.js";
import { getInteractionLibrary } from "../core/interactions.js";

export function mountLibraryView(sheet, panel, { createSheetResourcePreview, fitSheetResourcePreview } = {}) {

    const assets=panel.querySelector("[data-library-assets]");
    if(!assets||panel.dataset.libraryMounted==="true")return;
    panel.dataset.libraryMounted="true";assets.replaceChildren();
    sheet._libraryAssetScope??="core";
    const availableFolders=NEXUS_LIBRARY_CATALOG.categories??[];
    const preferredFolder=sheet._libraryFolder??NEXUS_LIBRARY_CATALOG.assets.find(item=>item.type===sheet._librarySelectedType)?.category;
    sheet._libraryFolder=availableFolders.some(folder=>folder.id===preferredFolder)?preferredFolder:(availableFolders[0]?.id??"core");
    const folderNav=document.createElement("nav");folderNav.className="nexus-library-folders";folderNav.setAttribute("aria-label","Categorias de assets");
    for(const {id,label,icon} of availableFolders){
      const button=document.createElement("button");button.type="button";button.dataset.libraryFolder=id;
      const glyph=document.createElement("i");glyph.className=icon;glyph.setAttribute("aria-hidden","true");
      const text=document.createElement("span");text.textContent=label;button.append(glyph,text);
      button.classList.toggle("active",id===sheet._libraryFolder);folderNav.append(button);
    }
    panel.querySelector(".nexus-library-scope-tabs")?.after(folderNav);
    for(const [index,asset] of NEXUS_LIBRARY_CATALOG.assets.entries()){
      const card=document.createElement("button");card.type="button";card.className="nexus-library-asset";
      card.dataset.libraryAsset=`${asset.label} ${asset.keywords??""}`.toLocaleLowerCase("pt-BR");
      card.dataset.libraryCategory=asset.category;card.dataset.assetType=asset.type;card.dataset.assetKey=asset.key??`${asset.category}-${index}`;
      const preview=document.createElement("span");preview.className=`nexus-library-preview-stage preview-${asset.preview??asset.type}`;
      if(asset.type==="sheet-resource"){
        const code=String(asset.template?.sheetCode??"PV").toUpperCase(),color=asset.template?.sheetColor??({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[code]??"#d94b4b";
        preview.append(createSheetResourcePreview({label:asset.template?.sheetContent1??code,current:32,max:40,color,showValues:true}));
        fitSheetResourcePreview(preview,{w:78,h:78},78);
      }else if(asset.type==="token"){const token=document.createElement("span");token.className="nexus-library-token-preview";token.textContent="N";preview.append(token);}
      else if(asset.type==="asset-notes"){const note=document.createElement("span");note.className="nexus-library-note-preview";note.innerHTML="<i></i><i></i><i></i>";preview.append(note);}
      else if(asset.type==="custom-card"){const area=document.createElement("span");area.className="nexus-library-area-preview";area.textContent="+";preview.append(area);}
      else if(asset.type==="sheet-section"){const marker=document.createElement("span");marker.className="nexus-library-marker-preview";marker.textContent="SEÇÃO";preview.append(marker);}
      else if(asset.type==="asset-image"){const image=document.createElement("span");image.className="nexus-library-image-preview";image.textContent="▧";preview.append(image);}
      else if(asset.type==="asset-meter"){const meter=document.createElement("span");meter.className="nexus-library-meter-preview";meter.innerHTML="<i></i>";preview.append(meter);}
      else if(asset.type==="asset-text"){const text=document.createElement("span");text.className="nexus-library-text-preview";text.textContent="Texto";preview.append(text);}
      else{const mock=document.createElement("span");mock.className="nexus-library-generic-preview";mock.textContent=asset.label.slice(0,2).toUpperCase();preview.append(mock);}
      const meta=document.createElement("span");meta.className="nexus-library-asset-meta";const label=document.createElement("strong");label.textContent=asset.label;meta.append(label);card.append(preview,meta);assets.append(card);
    }
    const themes=panel.querySelector("[data-library-themes]");
    const themeLabels={"nexus-dark":"NEXUS Escuro",midnight:"Meia-noite",light:"Claro",steam:"Steam",linux:"Linux",medieval:"Medieval","pixel-art":"Pixel Art"};
    for(const [id,palette] of Object.entries(THEME_PALETTES)){
      const card=document.createElement("button");card.type="button";card.className="nexus-library-asset nexus-library-theme-asset";
      const labelText=themeLabels[id]??id;card.dataset.libraryAsset=labelText.toLocaleLowerCase("pt-BR");card.dataset.libraryTheme=id;
      const preview=document.createElement("span");preview.className="nexus-library-preview-stage nexus-theme-swatch";preview.dataset.themeSwatch=id;
      for(const color of [palette.canvasColor,palette.cardColor,palette.accentColor,palette.highlightColor,palette.buttonColor]){const swatch=document.createElement("i");swatch.style.backgroundColor=color;preview.append(swatch);}
      const meta=document.createElement("span");meta.className="nexus-library-asset-meta";const label=document.createElement("strong");label.textContent=labelText;meta.append(label);card.append(preview,meta);themes?.append(card);
    }
    const flowContainer=panel.querySelector("[data-library-flows]");flowContainer?.replaceChildren();
    const flows=getInteractionLibrary(sheet.actor);
    if(flowContainer){
      if(!flows.length){const empty=document.createElement("p");empty.className="nexus-library-empty";empty.textContent="Nenhum fluxo salvo na biblioteca.";flowContainer.append(empty);}
      for(const entry of flows){
        const card=document.createElement("button");card.type="button";card.className="nexus-library-flow-card";card.dataset.libraryFlowId=entry.id;
        const icon=document.createElement("i");icon.className="fa-solid fa-diagram-project";icon.setAttribute("aria-hidden","true");
        const title=document.createElement("strong");title.textContent=entry.name||entry.flow?.name||"Fluxo salvo";
        const meta=document.createElement("small");meta.textContent=`${entry.flow?.triggers?.length??0} gatilhos · ${entry.flow?.actions?.length??0} ações`;
        card.append(icon,title,meta);flowContainer.append(card);
      }
    }
    const activateSection=(key)=>{
      panel.querySelectorAll("[data-library-section]").forEach(button=>{const active=button.dataset.librarySection===key;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));});
      panel.querySelectorAll("[data-library-section-panel]").forEach(section=>{section.hidden=section.dataset.librarySectionPanel!==key;});
      if(key==="assets")sheet._libraryApplyFilter?.();
      if(key==="themes"){
        const query=panel.querySelector("[data-library-search]")?.value.trim().toLocaleLowerCase("pt-BR")??"";
        const cards=[...panel.querySelectorAll("[data-library-theme]")];let visible=0;
        cards.forEach(card=>{card.hidden=!!query&&!card.dataset.libraryAsset.includes(query);if(!card.hidden)visible++;});
        panel.querySelector("[data-library-count]").textContent=`${visible} ${visible===1?"tema":"temas"}`;
      }
      if(key==="flows"){
        const query=panel.querySelector("[data-library-search]")?.value.trim().toLocaleLowerCase("pt-BR")??"";
        const cards=[...panel.querySelectorAll("[data-library-flow-id]")];let visible=0;
        cards.forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase("pt-BR").includes(query);if(!card.hidden)visible++;});
        panel.querySelector("[data-library-count]").textContent=`${visible} ${visible===1?"fluxo":"fluxos"}`;
      }
    };
    panel.querySelectorAll("[data-library-section]").forEach(button=>button.addEventListener("click",()=>activateSection(button.dataset.librarySection)));
    panel.querySelectorAll("[data-library-scope]").forEach(button=>button.addEventListener("click",()=>{
      sheet._libraryAssetScope=button.dataset.libraryScope;
      panel.querySelectorAll("[data-library-scope]").forEach(item=>item.classList.toggle("active",item===button));
      folderNav.hidden=sheet._libraryAssetScope!=="core";
      sheet._libraryApplyFilter?.();
    }));
    folderNav.addEventListener("click",event=>{
      const button=event.target.closest("[data-library-folder]");if(!button)return;
      sheet._libraryFolder=button.dataset.libraryFolder;
      folderNav.querySelectorAll("[data-library-folder]").forEach(item=>item.classList.toggle("active",item===button));
      sheet._libraryApplyFilter?.();
      const details=panel.querySelector("[data-library-details]");
      if(details){details.dataset.selectedType="";details.innerHTML='<div class="nexus-library-detail-placeholder"><strong>Assets</strong><p>Selecione um item para visualizar e configurar.</p></div>';}
    });
    folderNav.hidden=sheet._libraryAssetScope!=="core";
    panel.querySelectorAll("[data-library-scope]").forEach(button=>button.classList.toggle("active",button.dataset.libraryScope===sheet._libraryAssetScope));
    sheet._libraryApplyFilter?.();
}
