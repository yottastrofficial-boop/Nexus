import { NEXUS_LIBRARY_CATALOG } from "../../assets/library/catalog.js";
import { THEME_PALETTES } from "../core/theme.js";
import { getInteractionLibrary } from "../core/interactions.js";
import { readNexusLibraryStore, writeNexusLibraryStore } from "../core/library-store.js";
import { createLibraryFolder, assignLibraryEntryFolder, toggleLibraryFavorite, recordLibraryRecent, normalizeLibraryPreferences } from "../core/library-preferences.js";

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
      card.dataset.libraryCategory=asset.category;card.dataset.librarySource=asset.source??"core";card.dataset.assetType=asset.type;card.dataset.assetKey=asset.key??`${asset.category}-${index}`;
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
      templates: "Modelos e predefinições", assets: "Elementos salvos", media: "Mídia",
      styles: "Estilos", rules: "Regras", behaviors: "Interações"
    };
    const genericCollectionIcons = {
      templates: "fa-solid fa-id-card", assets: "fa-solid fa-cube", media: "fa-solid fa-photo-film",
      styles: "fa-solid fa-swatchbook", rules: "fa-solid fa-scale-balanced", behaviors: "fa-solid fa-gears"
    };
    const getLegacyLibraryFlags = () => Object.fromEntries([
      "libraryComponents","libraryGroups","libraryLayouts","libraryTemplates","libraryAssets",
      "libraryMedia","libraryThemes","libraryStyles","libraryRules","libraryBehaviors","interactionLibrary"
    ].map(key => [key, game.user?.getFlag?.("nexus", key)]));
    const getLibraryPreferences = () => normalizeLibraryPreferences(game.user?.getFlag?.("nexus", "libraryPreferences") ?? {});
    const persistLibraryPreferences = async preferences => game.user.setFlag("nexus", "libraryPreferences", preferences);
    const renderCustomFolderTree = collection => {
      const container = panel.querySelector("[data-library-custom-folders]");
      const heading = panel.querySelector("[data-library-custom-folder-heading]");
      if (!container) return;
      container.replaceChildren();
      const folders = getLibraryPreferences().folders.filter(folder => !folder.collection || folder.collection === collection);
      if (heading) heading.hidden = !folders.length;
      for (const folder of folders) {
        const button = document.createElement("button"); button.type = "button";
        button.className = "nexus-library-custom-folder";
        button.dataset.libraryCustomFolder = folder.id;
        button.textContent = folder.name;
        button.classList.toggle("active", panel.querySelector("[data-library-collection-folder]")?.value === folder.id);
        container.append(button);
      }
    };
    const renderGenericCollection = (collection, keepSelection = false) => {
      const container = panel.querySelector("[data-library-generic-items]");
      const detail = panel.querySelector("[data-library-generic-details]");
      if (!container || !detail || !genericCollectionLabels[collection]) return;
      let entries = [];
      try { entries = readNexusLibraryStore(game.user, getLegacyLibraryFlags()).store.collections[collection] ?? []; }
      catch (error) { console.warn("NEXUS | Não foi possível ler a coleção da Biblioteca", collection, error); }
      const preferences = getLibraryPreferences();
      renderCustomFolderTree(collection);
      const query = searchInput?.value.trim().toLocaleLowerCase("pt-BR") ?? "";
      const filter = panel.querySelector("[data-library-collection-filter].active")?.dataset.libraryCollectionFilter ?? "all";
      const folderId = panel.querySelector("[data-library-collection-folder]")?.value ?? "";
      const folderSelect = panel.querySelector("[data-library-collection-folder]");
      if (folderSelect) {
        const selected = folderSelect.value;
        folderSelect.replaceChildren();
        const all = document.createElement("option"); all.value = ""; all.textContent = "Todas as pastas"; folderSelect.append(all);
        for (const folder of preferences.folders.filter(item => !item.collection || item.collection === collection)) {
          const option = document.createElement("option"); option.value = folder.id; option.textContent = folder.name; folderSelect.append(option);
        }
        folderSelect.value = preferences.folders.some(item => item.id === selected) ? selected : "";
      }
      const activeFolder = folderSelect?.value ?? folderId;
      renderCustomFolderTree(collection);
      const visible = entries.filter(entry => {
        const key = `${collection}:${entry.id}`;
        const haystack = [entry.name,entry.label,entry.title,entry.description,entry.type,entry.sourceId, ...(Array.isArray(entry.tags) ? entry.tags : [])]
          .filter(value => value !== undefined && value !== null).join(" ").toLocaleLowerCase("pt-BR");
        if (query && !haystack.includes(query)) return false;
        if (filter === "favorites" && !preferences.favorites.includes(key)) return false;
        if (filter === "recent" && !preferences.recent.includes(key)) return false;
        const sourceId = String(entry.sourceId ?? "");
        const origin = entry.origin === "module" || entry.moduleId || sourceId.startsWith("module:") || sourceId.startsWith("module.") ? "module"
          : entry.origin === "extra" || entry.isExtra || sourceId.startsWith("extra:") || sourceId.startsWith("extra.") ? "extra"
          : entry.origin === "core" || sourceId.startsWith("nexus:") || sourceId.startsWith("core:") ? "core" : "mine";
        const originFilter = panel.querySelector("[data-library-origin-filter].active")?.dataset.libraryOriginFilter ?? "all";
        if (originFilter !== "all" && origin !== originFilter) return false;
        if (activeFolder && preferences.assignments[key] !== activeFolder) return false;
        return true;
      });
      container.replaceChildren();
      for (const entry of visible) {
        const key = `${collection}:${entry.id}`;
        const card = document.createElement("article"); card.className = "nexus-library-generic-card";
        const select = document.createElement("button"); select.type = "button"; select.className = "nexus-library-generic-item";
        select.dataset.libraryEntry = entry.id; select.dataset.libraryCollection = collection;
        const icon = document.createElement("i"); icon.className = genericCollectionIcons[collection]; icon.setAttribute("aria-hidden","true");
        const title = document.createElement("strong"); title.textContent = String(entry.name ?? entry.label ?? entry.title ?? "Item sem nome");
        const meta = document.createElement("small"); meta.textContent = String(entry.type ?? entry.sourceId ?? "Item salvo");
        select.append(icon,title,meta);
        const favorite = document.createElement("button"); favorite.type = "button"; favorite.className = "nexus-library-favorite";
        favorite.dataset.libraryFavorite = entry.id; favorite.dataset.libraryCollection = collection;
        favorite.setAttribute("aria-pressed", String(preferences.favorites.includes(key)));
        favorite.setAttribute("aria-label", preferences.favorites.includes(key) ? "Remover dos favoritos" : "Adicionar aos favoritos");
        favorite.textContent = preferences.favorites.includes(key) ? "★" : "☆";
        card.append(select,favorite); container.append(card);
      }
      if (!visible.length) {
        const empty = document.createElement("p"); empty.className = "nexus-library-empty";
        empty.textContent = entries.length ? "Nenhum item corresponde aos filtros selecionados." : "Esta coleção ainda não possui itens salvos.";
        container.append(empty);
      }
      panel.querySelector("[data-library-collection-heading]").textContent = genericCollectionLabels[collection];
      panel.querySelector("[data-library-collection-count]").textContent = `${visible.length} de ${entries.length} itens`;
      if (!keepSelection || !detail.dataset.selectedEntry) {
        detail.dataset.selectedCollection = collection; detail.dataset.selectedEntry = "";
        detail.innerHTML = '<div class="nexus-library-detail-placeholder"><span>▤</span><strong>Detalhes do item</strong><p>Selecione um item para consultar e editar seus metadados.</p></div>';
      }
    };
    const showGenericDetails = async (collection, entryId, card) => {
      const { store } = readNexusLibraryStore(game.user, getLegacyLibraryFlags());
      const entry = store.collections[collection]?.find(item => item.id === entryId);
      if (!entry) return;
      const preferences = recordLibraryRecent(getLibraryPreferences(), collection, entry.id);
      await persistLibraryPreferences(preferences);
      panel.querySelectorAll("[data-library-entry]").forEach(item => item.classList.toggle("is-selected", item === card));
      const detail = panel.querySelector("[data-library-generic-details]");
      detail.dataset.selectedCollection = collection; detail.dataset.selectedEntry = entry.id; detail.replaceChildren();
      const heading = document.createElement("div"); heading.className = "nexus-library-detail-heading";
      const title = document.createElement("strong"); title.className = "nexus-library-detail-title";
      title.textContent = String(entry.name ?? entry.label ?? entry.title ?? "Item sem nome"); heading.append(title);
      const form = document.createElement("div"); form.className = "nexus-library-metadata-editor";
      const nameLabel = document.createElement("label"); nameLabel.textContent = "Nome";
      const nameInput = document.createElement("input"); nameInput.type = "text"; nameInput.maxLength = 120; nameInput.dataset.libraryMetadata = "name"; nameInput.value = String(entry.name ?? entry.label ?? entry.title ?? "");
      nameLabel.append(nameInput);
      const descriptionLabel = document.createElement("label"); descriptionLabel.textContent = "Descrição";
      const descriptionInput = document.createElement("textarea"); descriptionInput.rows = 3; descriptionInput.maxLength = 1000; descriptionInput.dataset.libraryMetadata = "description"; descriptionInput.value = String(entry.description ?? "");
      descriptionLabel.append(descriptionInput);
      const tagsLabel = document.createElement("label"); tagsLabel.textContent = "Etiquetas (separadas por vírgula)";
      const tagsInput = document.createElement("input"); tagsInput.type = "text"; tagsInput.maxLength = 240; tagsInput.dataset.libraryMetadata = "tags"; tagsInput.value = Array.isArray(entry.tags) ? entry.tags.join(", ") : "";
      tagsLabel.append(tagsInput);
      const folderLabel = document.createElement("label"); folderLabel.textContent = "Pasta";
      const folderSelect = document.createElement("select"); folderSelect.dataset.libraryMetadata = "folder";
      const noFolder = document.createElement("option"); noFolder.value = ""; noFolder.textContent = "Sem pasta"; folderSelect.append(noFolder);
      for (const folder of preferences.folders.filter(item => !item.collection || item.collection === collection)) {
        const option = document.createElement("option"); option.value = folder.id; option.textContent = folder.name; folderSelect.append(option);
      }
      folderSelect.value = preferences.assignments[`${collection}:${entry.id}`] ?? ""; folderLabel.append(folderSelect);
      const save = document.createElement("button"); save.type = "button"; save.dataset.librarySaveMetadata = ""; save.textContent = "Salvar metadados";
      const visualPreview = document.createElement("div"); visualPreview.className = "nexus-library-type-preview";
      if (collection === "media") {
        const source = String(entry.path ?? entry.url ?? entry.src ?? "");
        const safeSource = /^(https?:\/\/|[\w./-]+$)/i.test(source) && !/^javascript:/i.test(source);
        const kind = String(entry.kind ?? entry.mediaType ?? source.split(/[?#]/)[0].split(".").pop() ?? "").toLowerCase();
        if (safeSource && /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#]|$)/i.test(source)) {
          const image = document.createElement("img"); image.src = source; image.alt = String(entry.name ?? "Prévia de mídia"); image.loading = "lazy"; visualPreview.append(image);
        } else if (safeSource && /\.(mp3|ogg|wav|m4a)(?:[?#]|$)/i.test(source)) {
          const audio = document.createElement("audio"); audio.controls = true; audio.preload = "none"; audio.src = source; visualPreview.append(audio);
        } else if (safeSource && /\.(mp4|webm|ogv)(?:[?#]|$)/i.test(source)) {
          const video = document.createElement("video"); video.controls = true; video.preload = "none"; video.src = source; visualPreview.append(video);
        } else {
          const note = document.createElement("p"); note.textContent = source ? `Prévia indisponível para este formato (${kind || "tipo não identificado"}).` : "Este item ainda não possui um caminho de mídia."; visualPreview.append(note);
        }
      } else if (collection === "styles") {
        const tokens = entry.tokens ?? entry.palette ?? {};
        for (const [key,value] of Object.entries(tokens).slice(0,16)) {
          if (typeof value !== "string" || !/^#(?:[0-9a-f]{3,8})$/i.test(value)) continue;
          const swatch = document.createElement("span"); swatch.className = "nexus-library-style-swatch";
          const color = document.createElement("i"); color.style.backgroundColor = value;
          const label = document.createElement("small"); label.textContent = key;
          swatch.append(color,label); visualPreview.append(swatch);
        }
      } else if (collection === "rules" && typeof entry.expression === "string") {
        const expression = document.createElement("code"); expression.textContent = entry.expression; visualPreview.append(expression);
      } else if (collection === "behaviors") {
        const flow = entry.flow ?? {};
        const summary = document.createElement("p"); summary.textContent = `${flow.triggers?.length ?? 0} gatilhos · ${flow.conditions?.length ?? 0} condições · ${flow.actions?.length ?? 0} ações`; visualPreview.append(summary);
      }
      const preview = document.createElement("pre"); preview.className = "nexus-library-safe-preview";
      const safeSummary = Object.fromEntries(Object.entries(entry).filter(([key,value]) => !["html","css","js","script","content","data","layout","flow","settings","palette","tokens","expression"].includes(key) && ["string","number","boolean"].includes(typeof value)).slice(0,12));
      preview.textContent = JSON.stringify(safeSummary,null,2);
      form.append(nameLabel,descriptionLabel,tagsLabel,folderLabel,save,preview);
      detail.append(heading,form);
    };
    panel.addEventListener("click", async event => {
      const customFolder = event.target.closest("[data-library-custom-folder]");
      if (customFolder && panel.contains(customFolder)) {
        const select = panel.querySelector("[data-library-collection-folder]");
        if (select) select.value = customFolder.dataset.libraryCustomFolder;
        const collection = detailCollection();
        if (collection) renderGenericCollection(collection);
        return;
      }
      const favorite = event.target.closest("[data-library-favorite]");
      if (favorite && panel.contains(favorite)) {
        event.preventDefault();
        await persistLibraryPreferences(toggleLibraryFavorite(getLibraryPreferences(), favorite.dataset.libraryCollection, favorite.dataset.libraryFavorite));
        renderGenericCollection(favorite.dataset.libraryCollection, true);
        return;
      }
      const createFolderButton = event.target.closest("[data-library-create-folder]");
      if (createFolderButton && panel.contains(createFolderButton)) {
        const collection = detailCollection();
        const input = panel.querySelector("[data-library-folder-name]");
        try {
          const result = createLibraryFolder(getLibraryPreferences(), { id: foundry.utils.randomID(10), name: input?.value, collection });
          await persistLibraryPreferences(result.preferences);
          if (input) input.value = "";
          renderGenericCollection(collection, true);
        } catch (error) { ui.notifications.warn(error.message); }
        return;
      }
      const saveMetadata = event.target.closest("[data-library-save-metadata]");
      if (saveMetadata && panel.contains(saveMetadata)) {
        const detail = panel.querySelector("[data-library-generic-details]");
        const collection = detail.dataset.selectedCollection, entryId = detail.dataset.selectedEntry;
        try {
          const { store } = readNexusLibraryStore(game.user, getLegacyLibraryFlags());
          const entry = store.collections[collection]?.find(item => item.id === entryId);
          if (!entry) return;
          const value = key => detail.querySelector(`[data-library-metadata="${key}"]`)?.value ?? "";
          const newName = value("name").trim();
          if (!newName) { ui.notifications.warn("O nome não pode ficar vazio."); return; }
          if ("name" in entry || !("label" in entry)) entry.name = newName; else entry.label = newName;
          if ("description" in entry || value("description")) entry.description = value("description").trim();
          entry.tags = value("tags").split(",").map(tag => tag.trim()).filter(Boolean).slice(0,20);
          const legacyFlagByCollection = { templates:"libraryTemplates", assets:"libraryAssets", media:"libraryMedia", styles:"libraryStyles", rules:"libraryRules", behaviors:"libraryBehaviors" };
          const legacyFlag = legacyFlagByCollection[collection];
          if (legacyFlag) await game.user.setFlag("nexus", legacyFlag, store.collections[collection]);
          await writeNexusLibraryStore(game.user, store);
          const preferences = assignLibraryEntryFolder(getLibraryPreferences(), collection, entryId, value("folder"));
          await persistLibraryPreferences(preferences);
          renderGenericCollection(collection, true);
          ui.notifications.info("Metadados salvos.");
        } catch (error) { ui.notifications.error(`Não foi possível salvar: ${error.message}`); }
        return;
      }
      const card = event.target.closest("[data-library-entry]");
      if (card && panel.contains(card)) {
        await showGenericDetails(card.dataset.libraryCollection, card.dataset.libraryEntry, card);
      }
    });
    const detailCollection = () => panel.querySelector("[data-library-generic-details]")?.dataset.selectedCollection ?? panel.querySelector("[data-library-section].active")?.dataset.librarySection?.replace("collection:","") ?? "";
    panel.querySelectorAll("[data-library-collection-filter]").forEach(button => button.addEventListener("click", () => {
      panel.querySelectorAll("[data-library-collection-filter]").forEach(item => item.classList.toggle("active", item === button));
      const collection = detailCollection(); if (collection) renderGenericCollection(collection);
    }));
    panel.querySelectorAll("[data-library-origin-filter]").forEach(button => button.addEventListener("click", () => {
      panel.querySelectorAll("[data-library-origin-filter]").forEach(item => item.classList.toggle("active", item === button));
      const collection = detailCollection(); if (collection) renderGenericCollection(collection);
    }));
    panel.querySelector("[data-library-collection-folder]")?.addEventListener("change", () => {
      const collection = detailCollection(); if (collection) renderGenericCollection(collection);
    });
    const activateSection=(key)=>{
      sheet._librarySection=key;
      panel.querySelectorAll("[data-library-section]").forEach(button=>{const sameSection=button.dataset.librarySection===key;const sameScope=button.dataset.libraryScope ? button.dataset.libraryScope===sheet._libraryAssetScope : !panel.querySelector('[data-library-section="' + key + '"][data-library-scope]');const active=sameSection&&sameScope;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));});
      panel.querySelectorAll("[data-library-section-panel]").forEach(section=>{
        const isGeneric = key.startsWith("collection:");
        section.hidden = isGeneric
          ? section.dataset.librarySectionPanel !== "collection"
          : section.dataset.librarySectionPanel !== key;
      });
      if(key.startsWith("collection:")) renderGenericCollection(key.slice("collection:".length));
      if(key==="assets") {
        sheet._libraryApplyFilter?.();
        const empty = panel.querySelector("[data-library-source-empty]");
        const scope = sheet._libraryAssetScope ?? "core";
        const hasItems = [...panel.querySelectorAll("[data-library-asset]")].some(card => !card.hidden);
        if (empty) { empty.hidden = hasItems || scope === "personal"; empty.textContent = scope === "modules" ? "Nenhum elemento de módulo foi disponibilizado." : scope === "extras" ? "Nenhum elemento extra foi disponibilizado." : "Não há elementos nesta origem ainda."; }
      }
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
        folderNav.hidden = sheet._libraryAssetScope !== "core";
        panel.querySelectorAll("[data-library-scope]").forEach(item => {
          const active = item.dataset.libraryScope === sheet._libraryAssetScope;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
      }
      activateSection(button.dataset.librarySection);
    }));
    panel.querySelector("[data-library-section-panel='collection']")?.setAttribute("data-library-section-panel","collection");
    activateSection(sheet._librarySection ?? "assets");
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
