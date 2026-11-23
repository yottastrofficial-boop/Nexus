import { NEXUS_LIBRARY_CATALOG } from "../../assets/library/catalog.js";
import { createLibraryCatalogExplorer } from "../library/catalog-explorer.js";
import { THEME_PALETTES } from "../core/theme.js";
import { getInteractionLibrary } from "../core/interactions.js";
import { NEXUS_LIBRARY_COLLECTIONS, readNexusLibraryStore, updateNexusLibraryStore } from "../core/library-store.js";
import { createLibraryFolder, assignLibraryEntryFolder, toggleLibraryFavorite, recordLibraryRecent, removeLibraryFolder, normalizeLibraryPreferences } from "../core/library-preferences.js";

export function mountLibraryView(sheet, panel, { createSheetResourcePreview, fitSheetResourcePreview } = {}) {

    const assets=panel.querySelector("[data-library-assets]");
    if(!assets||panel.dataset.libraryMounted==="true")return;
    panel.dataset.libraryMounted="true";assets.replaceChildren();
    const searchInput = panel.querySelector("[data-library-search]");
    if (searchInput) searchInput.value = sheet._librarySearchQuery ?? "";
    const tagFilter = panel.querySelector("[data-library-tag]");
    if (tagFilter) tagFilter.value = sheet._libraryTagFilter ?? "all";
    const originFilter = panel.querySelector("[data-library-origin]");
    if (originFilter) originFilter.value = sheet._libraryOriginFilter ?? "all";
    sheet._libraryAssetScope??="core";
    sheet._librarySmartView??="all";
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
    panel.querySelector('[data-library-section="assets"]')?.after(folderNav);
    for(const [index,asset] of NEXUS_LIBRARY_CATALOG.assets.entries()){
      const card=document.createElement("button");card.type="button";card.className="nexus-library-asset";
      card.dataset.libraryAsset=`${asset.label} ${asset.keywords??""}`.toLocaleLowerCase("pt-BR");
      card.dataset.libraryTags=(Array.isArray(asset.tags)?asset.tags:[]).map(tag=>String(tag).toLocaleLowerCase("pt-BR")).join(" ");
      card.dataset.libraryCategory=asset.category;card.dataset.librarySource=asset.source??"core";card.dataset.assetType=asset.type;card.dataset.assetKey=asset.key??`${asset.category}-${index}`;
      const preview=document.createElement("span");preview.className=`nexus-library-preview-stage preview-${asset.preview??asset.type}`;
      if(asset.type==="sheet-resource"){
        
        preview.append(createSheetResourcePreview({label:"",icon:"",current:32,max:40,color:"#8994a3",trackColor:"#293443",showValues:false}));
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
      templates: "Predefinições", assets: "Componentes salvos", components: "Componentes", groups: "Composições", layouts: "Modelos de ficha", themes: "Temas", media: "Mídia", flows: "Fluxos",
      styles: "Estilos visuais", properties: "Propriedades", rules: "Regras", behaviors: "Comportamentos", functions: "Funções", all: "Todos os itens"
    };
    const genericCollectionIcons = {
      templates: "fa-solid fa-id-card", assets: "fa-solid fa-cube", components: "fa-solid fa-cube", groups: "fa-solid fa-layer-group", layouts: "fa-solid fa-table-columns", themes: "fa-solid fa-palette", media: "fa-solid fa-photo-film", flows: "fa-solid fa-diagram-project",
      styles: "fa-solid fa-swatchbook", properties: "fa-solid fa-list-check", rules: "fa-solid fa-scale-balanced", behaviors: "fa-solid fa-gears", functions: "fa-solid fa-code", all: "fa-solid fa-layer-group"
    };
    const getLegacyLibraryFlags = () => Object.fromEntries([
      "libraryComponents","libraryGroups","libraryLayouts","libraryTemplates","libraryAssets",
      "libraryMedia","libraryThemes","libraryStyles","libraryProperties","libraryRules","libraryBehaviors","libraryFunctions","interactionLibrary"
    ].map(key => [key, game.user?.getFlag?.("nexus", key)]));
    const getLibraryPreferences = () => normalizeLibraryPreferences(game.user?.getFlag?.("nexus", "libraryPreferences") ?? {});
    const persistLibraryPreferences = async preferences => game.user.setFlag("nexus", "libraryPreferences", preferences);
    const universalCatalog = game.nexus?.library?.registry
      ? createLibraryCatalogExplorer({
          registry: game.nexus.library.registry,
          container: panel.querySelector("[data-library-generic-items]"),
          detail: panel.querySelector("[data-library-generic-details]"),
          getPreferences: getLibraryPreferences,
          savePreferences: persistLibraryPreferences
        })
      : null;
    searchInput?.addEventListener("input", () => {
      const active = panel.querySelector("[data-library-section].active")?.dataset.librarySection ?? "";
      if (active === "collection:all") void universalCatalog?.render({ query: searchInput.value, tag: panel.querySelector("[data-library-tag]")?.value ?? "all", origin: panel.querySelector("[data-library-origin]")?.value ?? "all", viewMode: sheet._libraryCollectionViewMode ?? "grid", cardSize: sheet._libraryCardSize ?? "medium" });
    });
    panel.querySelector("[data-library-filter-popover]")?.addEventListener("click", () => {
      requestAnimationFrame(() => {
        const active = panel.querySelector("[data-library-section].active")?.dataset.librarySection ?? "";
        if (active === "collection:all") void universalCatalog?.render({
          query: searchInput?.value ?? "",
          tag: panel.querySelector("[data-library-tag]")?.value ?? "all",
          origin: panel.querySelector("[data-library-origin]")?.value ?? "all",
          viewMode: sheet._libraryCollectionViewMode ?? "grid",
          cardSize: sheet._libraryCardSize ?? "medium"
        });
      });
    });
    const mirrorLegacyCollection = async (collection, store) => {
      const flags = { components:"libraryComponents", groups:"libraryGroups", layouts:"libraryLayouts", templates:"libraryTemplates", assets:"libraryAssets", media:"libraryMedia", themes:"libraryThemes", styles:"libraryStyles", properties:"libraryProperties", rules:"libraryRules", behaviors:"libraryBehaviors", flows:"interactionLibrary", functions:"libraryFunctions" };
      const flag = flags[collection];
      if (flag) await game.user.setFlag("nexus", flag, store.collections[collection]);
    };
    const refreshTagOptions = () => {
      const options = panel.querySelector(".nexus-library-filter-options");
      if (!options) return;
      const store = readNexusLibraryStore(game.user, getLegacyLibraryFlags()).store;
      const tags = [...new Set(NEXUS_LIBRARY_COLLECTIONS.flatMap(name => store.collections[name].flatMap(entry => Array.isArray(entry.tags) ? entry.tags : [])).map(tag => String(tag).trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,"pt-BR"));
      const selected = panel.querySelector("[data-library-tag]")?.value ?? "all";
      options.replaceChildren();
      for (const value of ["all", ...tags]) {
        const button = document.createElement("button"); button.type = "button";
        button.dataset.libraryTagOption = value; button.textContent = value === "all" ? "Sem filtro" : value;
        button.classList.toggle("active", value === selected); options.append(button);
      }
    };
    refreshTagOptions();

    const renderCustomFolderTree = collection => {
      const container = panel.querySelector("[data-library-custom-folders]");
      const heading = panel.querySelector("[data-library-custom-folder-heading]");
      if (!container) return;
      container.replaceChildren();
      const folders = getLibraryPreferences().folders.filter(folder => collection === "all" || !folder.collection || folder.collection === collection);
      if (heading) heading.hidden = !folders.length;
      for (const folder of folders) {
        const button = document.createElement("button"); button.type = "button";
        button.className = "nexus-library-custom-folder";
        button.dataset.libraryCustomFolder = folder.id;
        button.dataset.libraryFolderCollection = collection;
        button.textContent = folder.name;
        button.classList.toggle("active", (sheet._librarySelectedFolder ?? "") === folder.id);
        container.append(button);
      }
    };
    let folderContextMenu = null;
    const closeFolderContextMenu = () => {
      folderContextMenu?.remove();
      folderContextMenu = null;
    };
    panel.addEventListener("contextmenu", event => {
      const folderButton = event.target.closest("[data-library-custom-folder]");
      if (!folderButton || !panel.contains(folderButton)) return;
      event.preventDefault();
      closeFolderContextMenu();
      const bounds = panel.getBoundingClientRect();
      const menu = document.createElement("div");
      menu.className = "nexus-library-folder-context-menu";
      menu.setAttribute("role", "menu");
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.dataset.libraryFolderDelete = folderButton.dataset.libraryCustomFolder;
      removeButton.dataset.libraryFolderCollection = folderButton.dataset.libraryFolderCollection ?? "";
      removeButton.setAttribute("role", "menuitem");
      removeButton.textContent = "Excluir pasta";
      menu.append(removeButton);
      const maxLeft = Math.max(8, bounds.width - 164);
      const maxTop = Math.max(8, bounds.height - 48);
      menu.style.left = Math.max(8, Math.min(event.clientX - bounds.left, maxLeft)) + "px";
      menu.style.top = Math.max(8, Math.min(event.clientY - bounds.top, maxTop)) + "px";
      panel.append(menu);
      folderContextMenu = menu;
      removeButton.focus({ preventScroll: true });
    });
    panel.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !folderContextMenu) return;
      event.preventDefault();
      closeFolderContextMenu();
    });
    const renderGenericCollection = (collection, keepSelection = false) => {
      const container = panel.querySelector("[data-library-generic-items]");
      const detail = panel.querySelector("[data-library-generic-details]");
      if (!container || !detail || !genericCollectionLabels[collection]) return;
      if (collection === "all" && universalCatalog) {
        renderCustomFolderTree(collection);
        void universalCatalog.render({
          query: searchInput?.value ?? "",
          smartView: sheet._librarySmartView ?? "all",
          folder: sheet._librarySelectedFolder ?? "",
          tag: panel.querySelector("[data-library-tag]")?.value ?? "all",
          origin: panel.querySelector("[data-library-origin]")?.value ?? "all",
          viewMode: sheet._libraryCollectionViewMode ?? "grid",
          cardSize: sheet._libraryCardSize ?? "medium"
        });
        return;
      }
      let entries = [];
      try { const saved = readNexusLibraryStore(game.user, getLegacyLibraryFlags()).store.collections; entries = collection === "all" ? NEXUS_LIBRARY_COLLECTIONS.flatMap(name => saved[name].map(entry => ({ ...entry, __libraryCollection: name }))) : (saved[collection] ?? []).map(entry => ({ ...entry, __libraryCollection: collection })); }
      catch (error) { console.warn("NEXUS | Não foi possível ler a coleção da Biblioteca", collection, error); }
      const preferences = getLibraryPreferences();
      renderCustomFolderTree(collection);
      const query = searchInput?.value.trim().toLocaleLowerCase("pt-BR") ?? "";
      const filter = sheet._librarySmartView ?? "all";
      const selectedTag = panel.querySelector("[data-library-tag]")?.value ?? "all";
      const activeFolder = sheet._librarySelectedFolder ?? "";
      renderCustomFolderTree(collection);
      const visible = entries.filter(entry => {
        const entryCollection = entry.__libraryCollection ?? collection;
        const key = `${entryCollection}:${entry.id}`;
        const haystack = [entry.name,entry.label,entry.title,entry.description,entry.type,entry.sourceId, ...(Array.isArray(entry.tags) ? entry.tags : [])]
          .filter(value => value !== undefined && value !== null).join(" ").toLocaleLowerCase("pt-BR");
        if (query && !haystack.includes(query)) return false;
        const entryTags = (Array.isArray(entry.tags) ? entry.tags : []).map(tag => String(tag).toLocaleLowerCase("pt-BR"));
        if (selectedTag !== "all" && !entryTags.includes(selectedTag)) return false;
        if (filter === "favorites" && !preferences.favorites.includes(key)) return false;
        if (filter === "recent" && !preferences.recent.includes(key)) return false;
        if (activeFolder && preferences.assignments[key] !== activeFolder) return false;
        return true;
      });
      container.replaceChildren();
      sheet._libraryCollectionViewMode ??= "grid";
      sheet._libraryCardSize ??= "medium";
      container.dataset.viewMode = sheet._libraryCollectionViewMode;
      container.dataset.cardSize = sheet._libraryCardSize;
      panel.querySelectorAll("[data-library-collection-view-mode]").forEach(button => {
        const active = button.dataset.libraryCollectionViewMode === sheet._libraryCollectionViewMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      const cardSizeSelect = panel.querySelector("[data-library-card-size]");
      if (cardSizeSelect) cardSizeSelect.value = sheet._libraryCardSize;
      for (const entry of visible) {
        const entryCollection = entry.__libraryCollection ?? collection;
        const key = `${entryCollection}:${entry.id}`;
        const card = document.createElement("article"); card.className = "nexus-library-generic-card";
        const select = document.createElement("button"); select.type = "button"; select.className = "nexus-library-generic-item";
        select.dataset.libraryEntry = entry.id; select.dataset.libraryCollection = entryCollection;
        select.dataset.libraryTags = (Array.isArray(entry.tags) ? entry.tags : []).map(tag => String(tag).toLocaleLowerCase("pt-BR")).join(" ");
        const preview = document.createElement("span"); preview.className = "nexus-library-generic-preview";
        const icon = document.createElement("i"); icon.className = genericCollectionIcons[entryCollection] ?? genericCollectionIcons.assets; icon.setAttribute("aria-hidden","true"); preview.append(icon);
        const title = document.createElement("strong"); title.textContent = String(entry.name ?? entry.label ?? entry.title ?? "Item sem nome");
        const meta = document.createElement("small"); meta.textContent = genericCollectionLabels[entryCollection] ?? String(entry.type ?? "Item salvo");
        select.append(preview,title,meta);
        const favorite = document.createElement("button"); favorite.type = "button"; favorite.className = "nexus-library-favorite";
        favorite.dataset.libraryFavorite = entry.id; favorite.dataset.libraryCollection = entryCollection;
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
      } else if (collection === "layouts") {
        const layout = entry.layout ?? {};
        const summary = document.createElement("p"); summary.textContent = (layout.components?.length ?? 0) + " componentes · " + (layout.groups?.length ?? 0) + " grupos · " + (layout.width ?? "?") + " × " + (layout.height ?? "?") + " px"; visualPreview.append(summary);
      } else if (collection === "groups") {
        const summary = document.createElement("p"); summary.textContent = (entry.components?.length ?? entry.members?.length ?? 0) + " componentes · " + (entry.groups?.length ?? 0) + " subgrupos"; visualPreview.append(summary);
      } else if (collection === "components") {
        const summary = document.createElement("p"); summary.textContent = String(entry.type ?? "Componente") + " · Configuração reutilizável"; visualPreview.append(summary);
      } else if (collection === "themes") {
        const palette = entry.palette ?? {};
        for (const [key,value] of Object.entries(palette).slice(0,12)) {
          if (typeof value !== "string" || !/^#(?:[0-9a-f]{3,8})$/i.test(value)) continue;
          const swatch = document.createElement("span"); swatch.className = "nexus-library-style-swatch";
          const color = document.createElement("i"); color.style.backgroundColor = value;
          const label = document.createElement("small"); label.textContent = key;
          swatch.append(color,label); visualPreview.append(swatch);
        }
      } else if (collection === "flows") {
        const flow = entry.flow ?? entry;
        const summary = document.createElement("p"); summary.textContent = (flow.triggers?.length ?? 0) + " gatilhos · " + (flow.conditions?.length ?? 0) + " condições · " + (flow.actions?.length ?? 0) + " ações"; visualPreview.append(summary);
      } else if (collection === "styles") {
        const tokens = entry.tokens ?? entry.palette ?? {};
        for (const [key,value] of Object.entries(tokens).slice(0,16)) {
          if (typeof value !== "string" || !/^#(?:[0-9a-f]{3,8})$/i.test(value)) continue;
          const swatch = document.createElement("span"); swatch.className = "nexus-library-style-swatch";
          const color = document.createElement("i"); color.style.backgroundColor = value;
          const label = document.createElement("small"); label.textContent = key;
          swatch.append(color,label); visualPreview.append(swatch);
        }
      } else if (collection === "rules" && (typeof entry.expression === "string" || typeof entry.payload?.expression === "string")) {
        const expression = document.createElement("code"); expression.textContent = entry.expression ?? entry.payload.expression; visualPreview.append(expression);
      } else if (collection === "behaviors") {
        const flow = entry.flow ?? entry.payload?.flow ?? entry.payload ?? {};
        const summary = document.createElement("p"); summary.textContent = `${flow.triggers?.length ?? 0} gatilhos · ${flow.conditions?.length ?? 0} condições · ${flow.actions?.length ?? 0} ações`; visualPreview.append(summary);
      } else if (collection === "properties") {
        const payload = entry.payload ?? entry;
        const summary = document.createElement("p");
        summary.textContent = [payload.path ?? payload.key, payload.valueType ?? payload.type, payload.defaultValue !== undefined ? `Padrão: ${String(payload.defaultValue)}` : ""].filter(Boolean).join(" · ") || "Definição de propriedade";
        visualPreview.append(summary);
      } else if (collection === "functions") {
        const payload = entry.payload ?? entry;
        const summary = document.createElement("p");
        summary.textContent = [payload.operation ?? payload.signature ?? payload.name, payload.returnType ? `Retorna: ${payload.returnType}` : ""].filter(Boolean).join(" · ") || "Função registrada";
        visualPreview.append(summary);
      }
      if (["properties","rules","behaviors","functions"].includes(collection)) {
        const logic = document.createElement("section"); logic.className = "nexus-library-logic-preview";
        const logicHeading = document.createElement("strong"); logicHeading.textContent = "Definição lógica";
        const logicMeta = document.createElement("small");
        logicMeta.textContent = [entry.type, `Esquema ${entry.schemaVersion ?? 1}`, entry.enabled === false ? "Desativado" : "Ativo"].filter(Boolean).join(" · ");
        const payload = entry.payload ?? entry.flow ?? Object.fromEntries(Object.entries(entry).filter(([key]) => !["id","name","label","title","description","tags","dependencies","permissions"].includes(key)));
        const payloadView = document.createElement("pre"); payloadView.textContent = JSON.stringify(payload, null, 2).slice(0, 8000);
        logic.append(logicHeading, logicMeta, payloadView);
        const dependencyList = Array.isArray(entry.dependencies) ? entry.dependencies : [];
        if (dependencyList.length) {
          const dependencies = document.createElement("p"); dependencies.className = "nexus-library-logic-dependencies";
          dependencies.textContent = "Dependências: " + dependencyList.map(item => typeof item === "string" ? item : item.id ?? item.ref ?? "Referência").join(", ");
          logic.append(dependencies);
        }
        const permissionList = Array.isArray(entry.permissions) ? entry.permissions : [];
        if (permissionList.length) {
          const permissions = document.createElement("p"); permissions.className = "nexus-library-logic-dependencies";
          permissions.textContent = "Permissões: " + permissionList.join(", ");
          logic.append(permissions);
        }
        visualPreview.append(logic);
      }
      const preview = document.createElement("pre"); preview.className = "nexus-library-safe-preview";
      const safeSummary = Object.fromEntries(Object.entries(entry).filter(([key,value]) => !["html","css","js","script","content","data","layout","flow","settings","palette","tokens","expression"].includes(key) && ["string","number","boolean"].includes(typeof value)).slice(0,12));
      preview.textContent = JSON.stringify(safeSummary,null,2);
      const tabs = document.createElement("nav"); tabs.className = "nexus-library-detail-tabs"; tabs.setAttribute("aria-label", "Seções dos detalhes");
      const makeTab = (key, icon, label, active = false) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "nexus-library-detail-tab";
        button.dataset.libraryDetailTab = key; button.title = label; button.setAttribute("aria-label", label); button.setAttribute("aria-pressed", String(active));
        const glyph = document.createElement("i"); glyph.className = icon; glyph.setAttribute("aria-hidden", "true"); button.append(glyph); return button;
      };
      const makePanel = (key, label, active = false) => {
        const section = document.createElement("section"); section.className = "nexus-library-detail-panel"; section.dataset.libraryDetailPanel = key;
        section.setAttribute("aria-label", label); section.hidden = !active; return section;
      };
      const appearancePanel = makePanel("appearance", "Aparência", true);
      const dataPanel = makePanel("data", "Dados");
      const behaviorPanel = makePanel("behavior", "Interações");
      const advancedPanel = makePanel("advanced", "Avançado");
      tabs.append(makeTab("appearance", "fa-solid fa-palette", "Aparência", true), makeTab("data", "fa-solid fa-database", "Dados"), makeTab("behavior", "fa-solid fa-diagram-project", "Interações"), makeTab("advanced", "fa-solid fa-sliders", "Avançado"));
      appearancePanel.append(visualPreview);
      dataPanel.append(nameLabel, descriptionLabel, tagsLabel, folderLabel);
      if (collection === "properties") {
        const payload = entry.payload ?? entry;
        const details = document.createElement("dl"); details.className = "nexus-library-property-summary";
        for (const [labelText, value] of [["Caminho", payload.path ?? payload.key], ["Tipo", payload.valueType ?? payload.type], ["Valor padrão", payload.defaultValue]]) {
          if (value === undefined || value === null || value === "") continue;
          const term = document.createElement("dt"); term.textContent = labelText;
          const description = document.createElement("dd"); description.textContent = typeof value === "object" ? JSON.stringify(value) : String(value);
          details.append(term, description);
        }
        if (details.childElementCount) dataPanel.append(details);
      }
      behaviorPanel.append(...Array.from(visualPreview.querySelectorAll(".nexus-library-logic-preview")));
      advancedPanel.append(preview);
      const itemActions = document.createElement("div"); itemActions.className = "nexus-library-item-actions";
      const duplicate = document.createElement("button"); duplicate.type = "button"; duplicate.dataset.libraryDuplicateEntry = entry.id; duplicate.dataset.libraryDuplicateCollection = collection; duplicate.textContent = "Duplicar";
      const remove = document.createElement("button"); remove.type = "button"; remove.dataset.libraryDeleteEntry = entry.id; remove.dataset.libraryDeleteCollection = collection; remove.textContent = "Excluir";
      itemActions.append(duplicate, remove);
      form.append(tabs, appearancePanel, dataPanel, behaviorPanel, advancedPanel, save, itemActions);
      tabs.addEventListener("click", event => {
        const button = event.target.closest("[data-library-detail-tab]");
        if (!button || !tabs.contains(button)) return;
        const selected = button.dataset.libraryDetailTab;
        tabs.querySelectorAll("[data-library-detail-tab]").forEach(tab => {
          const active = tab === button; tab.classList.toggle("active", active); tab.setAttribute("aria-pressed", String(active));
        });
        form.querySelectorAll("[data-library-detail-panel]").forEach(section => { section.hidden = section.dataset.libraryDetailPanel !== selected; });
      });
      detail.append(heading, form);
    };
    panel.addEventListener("click", async event => {
      const openGlobalLibrary = event.target.closest("[data-library-open-global]");
      if (openGlobalLibrary && panel.contains(openGlobalLibrary)) {
        event.preventDefault();
        try { await game.nexus?.library?.open?.(); }
        catch (error) { ui.notifications?.error?.("Não foi possível abrir a Biblioteca: " + error.message); }
        return;
      }
      const folderDeleteButton = event.target.closest("[data-library-folder-delete]");
      if (folderDeleteButton && panel.contains(folderDeleteButton)) {
        event.preventDefault();
        const folderId = folderDeleteButton.dataset.libraryFolderDelete;
        const collection = folderDeleteButton.dataset.libraryFolderCollection;
        const folder = getLibraryPreferences().folders.find(item => item.id === folderId);
        closeFolderContextMenu();
        if (!folder || !collection) return;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: "Excluir pasta" },
          content: "<p>Excluir esta pasta? Os itens serão mantidos na Biblioteca e ficarão sem pasta.</p>",
          rejectClose: false
        });
        if (!confirmed) return;
        await persistLibraryPreferences(removeLibraryFolder(getLibraryPreferences(), folderId));
        if (sheet._librarySelectedFolder === folderId) sheet._librarySelectedFolder = "";
        renderGenericCollection(collection, true);
        return;
      }
      if (!event.target.closest(".nexus-library-folder-context-menu")) closeFolderContextMenu();
      const customFolder = event.target.closest("[data-library-custom-folder]");
      if (customFolder && panel.contains(customFolder)) {
        sheet._librarySelectedFolder = customFolder.dataset.libraryCustomFolder;
        const collection = detailCollection();
        if (collection) renderGenericCollection(collection);
        return;
      }
      const favorite = event.target.closest("[data-library-favorite]");
      if (favorite && panel.contains(favorite)) {
        event.preventDefault();
        await persistLibraryPreferences(toggleLibraryFavorite(getLibraryPreferences(), favorite.dataset.libraryCollection, favorite.dataset.libraryFavorite));
        const activeSection = panel.querySelector("[data-library-section].active")?.dataset.librarySection ?? "";
        const activeCollection = activeSection.startsWith("collection:") ? activeSection.slice("collection:".length) : favorite.dataset.libraryCollection;
        renderGenericCollection(activeCollection, true);
        return;
      }
      const createFolderButton = event.target.closest("[data-library-create-folder]");
      if (createFolderButton && panel.contains(createFolderButton)) {
        const collection = detailCollection();
        const input = panel.querySelector("[data-library-folder-name]");
        try {
          const result = createLibraryFolder(getLibraryPreferences(), { id: foundry.utils.randomID(10), name: input?.value, collection: collection === "all" ? "" : collection });
          await persistLibraryPreferences(result.preferences);
          if (input) input.value = "";
          renderGenericCollection(collection, true);
        } catch (error) { ui.notifications.warn(error.message); }
        return;
      }
      const duplicateEntry = event.target.closest("[data-library-duplicate-entry]");
      if (duplicateEntry && panel.contains(duplicateEntry)) {
        const collection = duplicateEntry.dataset.libraryDuplicateCollection;
        const entryId = duplicateEntry.dataset.libraryDuplicateEntry;
        try {
          const savedStore = await updateNexusLibraryStore(game.user, store => {
            const original = store.collections[collection]?.find(item => String(item.id) === entryId);
            if (!original) throw new Error("O item original não existe mais.");
            const copy = foundry.utils.deepClone(original);
            const suffix = foundry.utils.randomID(8).toLowerCase();
            copy.id = ["properties","rules","behaviors","functions"].includes(collection) ? String(original.id) + ".copy-" + suffix : suffix;
            if (copy.sourceId) copy.sourceId = String(copy.sourceId) + "-copy-" + suffix;
            if ("name" in copy || !("label" in copy)) copy.name = String(original.name ?? original.label ?? "Item") + " (cópia)";
            else copy.label = String(original.label) + " (cópia)";
            store.collections[collection].push(copy);
            return store;
          });
          await mirrorLegacyCollection(collection, savedStore);
          renderGenericCollection(detailCollection());
          ui.notifications.info("Cópia criada na Biblioteca.");
        } catch (error) { ui.notifications.error("Não foi possível duplicar: " + error.message); }
        return;
      }
      const deleteEntry = event.target.closest("[data-library-delete-entry]");
      if (deleteEntry && panel.contains(deleteEntry)) {
        const collection = deleteEntry.dataset.libraryDeleteCollection;
        const entryId = deleteEntry.dataset.libraryDeleteEntry;
        const { store: dependencyStore } = readNexusLibraryStore(game.user, getLegacyLibraryFlags());
        const storedDependents = NEXUS_LIBRARY_COLLECTIONS.flatMap(name => dependencyStore.collections[name]
          .filter(item => String(item.id) !== entryId && Array.isArray(item.dependencies))
          .filter(item => item.dependencies.some(dependency => String(typeof dependency === "string" ? dependency : dependency?.id ?? "") === entryId)));
        const logicDependents = ["properties","rules","behaviors","functions"].includes(collection)
          ? (game.nexus?.logic?.registry?.getDependents?.(entryId) ?? []) : [];
        if (storedDependents.length || logicDependents.length) {
          ui.notifications.warn("Este item possui dependências e não pode ser excluído agora.");
          return;
        }
        const confirmed = await foundry.applications.api.DialogV2.confirm({ window: { title: "Excluir item da Biblioteca" }, content: "<p>Excluir este item? A ação não altera componentes já inseridos nas fichas.</p>", rejectClose: false });
        if (!confirmed) return;
        try {
          const savedStore = await updateNexusLibraryStore(game.user, store => { store.collections[collection] = store.collections[collection].filter(item => String(item.id) !== entryId); return store; });
          await mirrorLegacyCollection(collection, savedStore);
          if (["properties","rules","behaviors","functions"].includes(collection)) game.nexus?.logic?.registry?.remove?.(entryId);
          const preferences = getLibraryPreferences(); const key = collection + ":" + entryId;
          preferences.favorites = preferences.favorites.filter(item => item !== key); preferences.recent = preferences.recent.filter(item => item !== key); delete preferences.assignments[key];
          await persistLibraryPreferences(preferences); renderGenericCollection(detailCollection());
          ui.notifications.info("Item excluído da Biblioteca.");
        } catch (error) { ui.notifications.error("Não foi possível excluir: " + error.message); }
        return;
      }
      const saveMetadata = event.target.closest("[data-library-save-metadata]");
      if (saveMetadata && panel.contains(saveMetadata)) {
        const detail = panel.querySelector("[data-library-generic-details]");
        const collection = detail.dataset.selectedCollection, entryId = detail.dataset.selectedEntry;
        try {
          const value = key => detail.querySelector('[data-library-metadata="' + key + '"]')?.value ?? "";
          const newName = value("name").trim();
          if (!newName) { ui.notifications.warn("O nome não pode ficar vazio."); return; }
          const savedStore = await updateNexusLibraryStore(game.user, store => {
            const entry = store.collections[collection]?.find(item => item.id === entryId);
            if (!entry) throw new Error("O item selecionado não existe mais na Biblioteca.");
            if ("name" in entry || !("label" in entry)) entry.name = newName; else entry.label = newName;
            if ("description" in entry || value("description")) entry.description = value("description").trim();
            entry.tags = value("tags").split(",").map(tag => tag.trim()).filter(Boolean).slice(0,20);
            return store;
          });
          if (["properties","rules","behaviors","functions"].includes(collection)) {
            const updatedAsset = savedStore.collections[collection]?.find(item => String(item.id) === entryId);
            try { if (updatedAsset) game.nexus?.logic?.registry?.register?.(updatedAsset, { replace: true }); }
            catch (registryError) { console.warn("NEXUS | Não foi possível atualizar o registro lógico após editar metadados.", registryError); }
          }
          try { await mirrorLegacyCollection(collection, savedStore); }
          catch (mirrorError) { console.warn("NEXUS | Falha ao espelhar a coleção legada da Biblioteca.", mirrorError); }
          const preferences = assignLibraryEntryFolder(getLibraryPreferences(), collection, entryId, value("folder"));
          await persistLibraryPreferences(preferences);
          const activeSectionKey = panel.querySelector("[data-library-section].active")?.dataset.librarySection ?? "";
          const activeCollection = activeSectionKey.startsWith("collection:") ? activeSectionKey.slice("collection:".length) : collection;
          renderGenericCollection(activeCollection, true);
          refreshTagOptions();
          const refreshedCard = panel.querySelector('[data-library-entry="' + entryId + '"][data-library-collection="' + collection + '"]');
          if (refreshedCard) await showGenericDetails(collection, entryId, refreshedCard);
          ui.notifications.info("Metadados salvos.");
        } catch (error) { ui.notifications.error(`Não foi possível salvar: ${error.message}`); }
        return;
      }
      const card = event.target.closest("[data-library-entry]");
      if (card && panel.contains(card)) {
        await showGenericDetails(card.dataset.libraryCollection, card.dataset.libraryEntry, card);
      }
    });
    const detailCollection = () => panel.querySelector("[data-library-section].active")?.dataset.librarySection?.replace("collection:","") ?? panel.querySelector("[data-library-generic-details]")?.dataset.selectedCollection ?? "";
    panel.querySelectorAll("[data-library-collection-view-mode]").forEach(button => button.addEventListener("click", () => {
      sheet._libraryCollectionViewMode = button.dataset.libraryCollectionViewMode === "list" ? "list" : "grid";
      const collection = detailCollection(); if (collection) renderGenericCollection(collection, true);
    }));
    panel.querySelector("[data-library-card-size]")?.addEventListener("change", event => {
      sheet._libraryCardSize = ["small","medium","large"].includes(event.target.value) ? event.target.value : "medium";
      const collection = detailCollection(); if (collection) renderGenericCollection(collection, true);
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
      if (button.dataset.librarySmartView) { sheet._librarySmartView = button.dataset.librarySmartView; sheet._librarySelectedFolder = ""; panel.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.toggle("active", item === button)); }
      else { sheet._librarySmartView = "all"; panel.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.toggle("active", item.dataset.librarySmartView === "all")); }
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
