import { NEXUS_LIBRARY_CATALOG } from "../../assets/library/catalog.js";
import { THEME_PALETTES } from "../core/theme.js";
import { getInteractionLibrary } from "../core/interactions.js";
import { readNexusLibraryStore } from "../core/library-store.js";

export function mountLibraryView(sheet, panel, { createSheetResourcePreview, fitSheetResourcePreview } = {}) {

    const assets=panel.querySelector("[data-library-assets]");
    if(!assets||panel.dataset.libraryMounted==="true")return;
    panel.dataset.libraryMounted="true";assets.replaceChildren();
    const searchInput = panel.querySelector("[data-library-search]");
    if (searchInput) searchInput.value = sheet._librarySearchQuery ?? "";
    const tagFilter = panel.querySelector("[data-library-tag]");
    if (tagFilter) tagFilter.value = sheet._libraryTagFilter ?? "all";
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
      }else if(asset.type==="sheet-proficiency"){const marker=document.createElement("span");marker.className="nexus-library-proficiency-preview";const dot=document.createElement("i");marker.append(dot);preview.append(marker);}else if(asset.type==="token"){const token=document.createElement("span");token.className="nexus-library-token-preview";token.textContent="N";preview.append(token);}
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
      const selected=id===(sheet._currentLayout?.theme??"nexus-dark");card.classList.toggle("is-selected",selected);card.setAttribute("aria-pressed",String(selected));
      const preview=document.createElement("span");preview.className="nexus-library-preview-stage nexus-theme-swatch";preview.dataset.themeSwatch=id;
      for(const color of [palette.canvasColor,palette.cardColor,palette.accentColor,palette.highlightColor,palette.buttonColor]){const swatch=document.createElement("i");swatch.style.backgroundColor=color;preview.append(swatch);}
      const meta=document.createElement("span");meta.className="nexus-library-asset-meta";const label=document.createElement("strong");label.textContent=labelText;meta.append(label);card.append(preview,meta);themes?.append(card);
    }
    const renderCustomThemes = () => {
      themes?.querySelectorAll("[data-library-custom-theme]").forEach(card => card.remove());
      const customThemes=game.user?.getFlag?.("nexus","libraryThemes")??[];
      for(const theme of customThemes){
        if(!theme?.id||!theme.palette)continue;
        const card=document.createElement("button");card.type="button";card.className="nexus-library-asset nexus-library-theme-asset";
        const labelText=String(theme.name??"Tema personalizado");card.dataset.libraryAsset=labelText.toLocaleLowerCase("pt-BR");card.dataset.libraryCustomTheme=theme.id;
        const selected=theme.id===(sheet._currentLayout?.customThemeId??"");card.classList.toggle("is-selected",selected);card.setAttribute("aria-pressed",String(selected));
        const preview=document.createElement("span");preview.className="nexus-library-preview-stage nexus-theme-swatch";
        for(const key of ["canvasColor","cardColor","accentColor","highlightColor","buttonColor"]){const swatch=document.createElement("i");swatch.style.backgroundColor=theme.palette[key]??"#52647b";preview.append(swatch);}
        const meta=document.createElement("span");meta.className="nexus-library-asset-meta";const label=document.createElement("strong");label.textContent=labelText;meta.append(label);card.append(preview,meta);themes?.append(card);
      }
    };
    sheet._libraryRenderCustomThemes=renderCustomThemes;
    renderCustomThemes();
    const flowContainer=panel.querySelector("[data-library-flows]");
    const renderSavedFlows = () => {
      flowContainer?.replaceChildren();
      const flows=getInteractionLibrary(sheet.actor);
      if(!flowContainer)return;
      if(!flows.length){const empty=document.createElement("p");empty.className="nexus-library-empty";empty.textContent="Nenhum fluxo salvo na biblioteca.";flowContainer.append(empty);}
      for(const entry of flows){
        const card=document.createElement("button");card.type="button";card.className="nexus-library-flow-card";card.dataset.libraryFlowId=entry.id;
        const icon=document.createElement("i");icon.className="fa-solid fa-diagram-project";icon.setAttribute("aria-hidden","true");
        const title=document.createElement("strong");title.textContent=entry.name||entry.flow?.name||"Fluxo salvo";
        const meta=document.createElement("small");meta.textContent=`${entry.flow?.triggers?.length??0} gatilhos · ${entry.flow?.conditions?.length??0} condições · ${entry.flow?.actions?.length??0} ações`;
        card.append(icon,title,meta);flowContainer.append(card);
      }
    };
    sheet._libraryRenderSavedFlows=renderSavedFlows;
    renderSavedFlows();
    const genericCollectionLabels = {
      templates: "Modelos de ficha", assets: "Assets salvos", media: "Mídia",
      styles: "Estilos visuais", rules: "Regras", behaviors: "Comportamentos"
    };
    const genericCollectionIcons = {
      templates: "fa-solid fa-id-card", assets: "fa-solid fa-cube", media: "fa-solid fa-photo-film",
      styles: "fa-solid fa-swatchbook", rules: "fa-solid fa-scale-balanced", behaviors: "fa-solid fa-gears"
    };
    const renderGenericCollection = collection => {
      const container = panel.querySelector("[data-library-generic-items]");
      const detail = panel.querySelector("[data-library-generic-details]");
      if (!container || !detail || !genericCollectionLabels[collection]) return;
      const legacyFlags = Object.fromEntries([
        "libraryComponents","libraryGroups","libraryLayouts","libraryTemplates","libraryAssets",
        "libraryMedia","libraryThemes","libraryStyles","libraryRules","libraryBehaviors","interactionLibrary"
      ].map(key => [key, game.user?.getFlag?.("nexus", key)]));
      let entries = [];
      try {
        const { store } = readNexusLibraryStore(game.user, legacyFlags);
        entries = store.collections[collection] ?? [];
      } catch (error) {
        console.warn("NEXUS | Não foi possível ler a coleção da Biblioteca", collection, error);
      }
      const query = searchInput?.value.trim().toLocaleLowerCase("pt-BR") ?? "";
      container.replaceChildren();
      const visible = entries.filter(entry => {
        const haystack = [entry.name,entry.label,entry.title,entry.description,entry.type,entry.sourceId]
          .filter(value => value !== undefined && value !== null).join(" ").toLocaleLowerCase("pt-BR");
        return !query || haystack.includes(query);
      });
      for (const entry of visible) {
        const card = document.createElement("button");
        card.type = "button"; card.className = "nexus-library-generic-item";
        card.dataset.libraryEntry = entry.id; card.dataset.libraryCollection = collection;
        const icon = document.createElement("i"); icon.className = genericCollectionIcons[collection]; icon.setAttribute("aria-hidden","true");
        const title = document.createElement("strong"); title.textContent = String(entry.name ?? entry.label ?? entry.title ?? "Item sem nome");
        const meta = document.createElement("small"); meta.textContent = String(entry.type ?? entry.sourceId ?? "Item salvo");
        card.append(icon,title,meta); container.append(card);
      }
      if (!visible.length) {
        const empty = document.createElement("p"); empty.className = "nexus-library-empty";
        empty.textContent = entries.length ? "Nenhum item corresponde à pesquisa." : "Esta coleção ainda não possui itens salvos.";
        container.append(empty);
      }
      panel.querySelector("[data-library-collection-heading]").textContent = genericCollectionLabels[collection];
      panel.querySelector("[data-library-collection-count]").textContent = `${visible.length} de ${entries.length} itens`;
      detail.dataset.selectedCollection = collection;
      detail.dataset.selectedEntry = "";
      detail.innerHTML = '<div class="nexus-library-detail-placeholder"><span>▤</span><strong>Detalhes do item</strong><p>Selecione um item para consultar os dados armazenados. O editor específico desta coleção ainda não está disponível.</p></div>';
    };
    panel.addEventListener("click", event => {
      const card = event.target.closest("[data-library-entry]");
      if (!card || !panel.contains(card)) return;
      const collection = card.dataset.libraryCollection;
      const legacyFlags = Object.fromEntries([
        "libraryComponents","libraryGroups","libraryLayouts","libraryTemplates","libraryAssets",
        "libraryMedia","libraryThemes","libraryStyles","libraryRules","libraryBehaviors","interactionLibrary"
      ].map(key => [key, game.user?.getFlag?.("nexus", key)]));
      try {
        const { store } = readNexusLibraryStore(game.user, legacyFlags);
        const entry = store.collections[collection]?.find(item => item.id === card.dataset.libraryEntry);
        if (!entry) return;
        panel.querySelectorAll("[data-library-entry]").forEach(item => item.classList.toggle("is-selected", item === card));
        const detail = panel.querySelector("[data-library-generic-details]");
        detail.dataset.selectedCollection = collection; detail.dataset.selectedEntry = entry.id; detail.replaceChildren();
        const heading = document.createElement("div"); heading.className = "nexus-library-detail-heading";
        const title = document.createElement("strong"); title.className = "nexus-library-detail-title";
        title.textContent = String(entry.name ?? entry.label ?? entry.title ?? "Item sem nome"); heading.append(title);
        const description = document.createElement("p"); description.className = "nexus-library-definition-note";
        description.textContent = String(entry.description ?? "Conteúdo salvo na Biblioteca NEXUS.");
        const metadata = document.createElement("small"); metadata.className = "nexus-library-definition-note";
        metadata.textContent = `ID: ${entry.id} · Tipo: ${entry.type ?? "não especificado"}`;
        const status = document.createElement("p"); status.className = "nexus-library-definition-note";
        status.textContent = "Prévia e edição específicas ainda não estão disponíveis para esta coleção. Os dados originais não foram modificados.";
        detail.append(heading,description,metadata,status);
      } catch (error) { console.warn("NEXUS | Falha ao abrir detalhes da coleção", error); }
    });
    const activateSection=(key)=>{
      sheet._librarySection=key;
      panel.querySelectorAll("[data-library-section]").forEach(button=>{const active=button.dataset.librarySection===key;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));});
      panel.querySelectorAll("[data-library-section-panel]").forEach(section=>{
        const isGeneric = key.startsWith("collection:");
        section.hidden = isGeneric
          ? section.dataset.librarySectionPanel !== "collection"
          : section.dataset.librarySectionPanel !== key;
      });
      if(key.startsWith("collection:")) renderGenericCollection(key.slice("collection:".length));
      if(key==="assets")sheet._libraryApplyFilter?.();
      if(key==="themes"){
        const query=panel.querySelector("[data-library-search]")?.value.trim().toLocaleLowerCase("pt-BR")??"";
        const cards=[...panel.querySelectorAll("[data-library-theme],[data-library-custom-theme]")];let visible=0;
        cards.forEach(card=>{card.hidden=!!query&&!String(card.dataset.libraryAsset??"").includes(query);if(!card.hidden)visible++;});
        panel.querySelector("[data-library-count]").textContent=`${visible} ${visible===1?"tema":"temas"}`;
      }
      if(key==="flows"){
        const query=panel.querySelector("[data-library-search]")?.value.trim().toLocaleLowerCase("pt-BR")??"";
        const cards=[...panel.querySelectorAll("[data-library-flow-id]")];let visible=0;
        cards.forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase("pt-BR").includes(query);if(!card.hidden)visible++;});
        panel.querySelector("[data-library-count]").textContent=`${visible} ${visible===1?"fluxo":"fluxos"}`;
      }
    };
    panel.querySelectorAll("[data-library-section]").forEach(button=>button.addEventListener("click",()=>{
      if (button.dataset.libraryScope) {
        sheet._libraryAssetScope = button.dataset.libraryScope;
        panel.querySelectorAll("[data-library-scope]").forEach(item => item.classList.toggle("active", item === button));
      }
      activateSection(button.dataset.librarySection);
    }));
    panel.querySelector("[data-library-section-panel='collection']")?.setAttribute("data-library-section-panel","collection");
    activateSection(sheet._librarySection ?? "assets");
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
