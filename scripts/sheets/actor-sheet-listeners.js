import { validateGroupParent } from "../core/group-hierarchy.js";
import { serializeActorPropertyWrite } from "../core/actor-property-writes.js";

import { activateActorPropertyValueListeners } from "./actor-property-value-listeners.js";
import { activateActorPropertyPickerListeners } from "./actor-property-picker-listeners.js";
import { activateActorAliasListeners } from "./actor-alias-listeners.js";
import { activateActorSheetSkillListeners } from "./actor-sheet-skill-listeners.js";
import { activateActorSheetResourceListeners } from "./actor-sheet-resource-listeners.js";
/**
 * Event bindings for the NEXUS Actor Sheet.
 * Kept separate from the sheet class so the lifecycle facade stays focused.
 */
export function activateActorSheetListeners(sheet, html, dependencies) {
  const { NEXUS_LIBRARY_CATALOG, NEXUS_SKILLS, applyInteractionEditorChange, applyInteractionEditorCommand, getInteractionLibrary, getComponentInteractions, COMPONENTS, resolveNexusBinding, normalizeNexusPropertyPath, clone, getPath, getNativePropertyDefinitions, getAliasDefinitions, safeAliasKey, clamp, isVideoSource, isImageSource, createSheetResourcePreview, fitSheetResourcePreview, updateSheetResourcePreview } = dependencies;

    const currentRoot = html?.[0];
    const inspectorNamespace = `.nexusInspector${String(sheet.id).replace(/[^a-zA-Z0-9]/g, "")}`;
    sheet._nexusInspectorNamespace = inspectorNamespace;
    $(document).off(inspectorNamespace);
    const isSheetOwnedControl = input => currentRoot?.contains(input) || [...(sheet._nexusPanelWindows?.values?.() ?? [])].some(instance => instance?.element?.contains(input));
    // Remove detached property-option portals left by a previous ApplicationV2 render.
    document.querySelectorAll(`[data-nexus-property-owner="${sheet.id}"]`).forEach(list => {
      if (!list._nexusOwnerInspector?.isConnected) list.remove();
    });
    html.find("[data-action]").on("click", async event => {
      const button = event.currentTarget, action = button.dataset.action;
      if (action === "mode") return sheet._setMode(button.dataset.mode);
      if (action === "add-component") {
        try { return await sheet._addComponent(button.dataset.type); }
        catch (error) {
          console.error("NEXUS | Falha ao adicionar componente", error);
          ui.notifications?.error?.("Não foi possível adicionar o componente. Consulte o console para detalhes.");
          return;
        }
      }
      if (action === "save-layout") return sheet._saveCanvas(html);
      if (action === "new-layout") return sheet._newLayout();
      if (action === "switch-layout") return sheet._switchLayout(button.dataset.layoutId);
      if (action === "select-all") return sheet._selectAll(html);
      if (action === "clear-selection") return sheet._setSelection(html, []);
      if (action === "group-selection") return sheet._groupSelection(html);
      if (action === "ungroup-selection") return sheet._ungroupSelection(html);
      if (action === "duplicate-selection") return sheet._duplicateComponents([...sheet._selectedIds ?? []]);
      if (action === "layer-front") return sheet._changeLayer("front");
      if (action === "layer-forward") return sheet._changeLayer("forward");
      if (action === "layer-backward") return sheet._changeLayer("backward");
      if (action === "layer-back") return sheet._changeLayer("back");
      if (action === "global-colors-default") return sheet._resetGlobalAppearance("colors");
      if (action === "global-fonts-default") return sheet._resetGlobalAppearance("fonts");
      if (action === "resource-adjust") return sheet._adjustResource(button.dataset.path, Number(button.dataset.delta));
      if (action === "component-roll") return sheet._rollComponent(button.dataset.componentId);
      if (action === "save-group-library") return sheet._saveSelectedGroupToLibrary();
      if (action === "save-library-component") return sheet._saveSelectedLibraryComponent();
    });
    activateActorSheetSkillListeners(sheet, html, dependencies);
    activateActorSheetResourceListeners(sheet, html, dependencies);
    html.find("[data-system-path]").on("change", event => sheet._updateSystemValue(event.currentTarget));
    html.find("[data-component-local-value]").on("change", async event => {
      const input = event.currentTarget;
      const componentId = input.dataset.componentId;
      if (!componentId) return;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === componentId);
      if (!component) return;
      sheet._captureHistory();
      component.localValue = String(input.value ?? "").slice(0, 5000);
      await sheet._writeLayouts(layouts, active);
    });
    activateActorPropertyValueListeners(sheet, inspectorNamespace, isSheetOwnedControl, dependencies);
    html.find("[data-config-system-path]").on("change", event => { const input = event.currentTarget; input.dataset.systemPath = input.dataset.configSystemPath; sheet._updateSystemValue(input); });
    html.find("[data-config-component-code]").on("change", async event => {
      const input = event.currentTarget, id = input.dataset.componentId;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === id);
      if (!component) return;
      sheet._captureHistory(); component.sheetCode = String(input.value ?? "").slice(0, 24);
      await sheet._writeLayouts(layouts, active);
    });
    html.find("[data-config-component-text]").on("change", async event => {
      const input = event.currentTarget, id = input.dataset.componentId;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === id);
      if (!component) return;
      sheet._captureHistory(); component.text = String(input.value ?? "").slice(0, 500);
      await sheet._writeLayouts(layouts, active);
    });
    const pendingResourceValueSaves = new WeakMap();
    $(document).on(`input${inspectorNamespace}`, "[data-config-current-value], [data-config-max-value]", event => {
      const input = event.currentTarget;
      if (!isSheetOwnedControl(input)) return;
      const previousTimer = pendingResourceValueSaves.get(input);
      if (previousTimer) clearTimeout(previousTimer);
      const timer = setTimeout(() => {
        pendingResourceValueSaves.delete(input);
        if (input.isConnected && input.value !== "" && Number.isFinite(Number(input.value))) $(input).trigger("change");
      }, 180);
      pendingResourceValueSaves.set(input, timer);
    });
    $(document).on(`change${inspectorNamespace}`, "[data-config-current-value], [data-config-max-value]", async event => {
      const input = event.currentTarget;
      if (!isSheetOwnedControl(input)) return;
      await serializeActorPropertyWrite(sheet.actor, async () => {
      const pendingTimer = pendingResourceValueSaves.get(input);
      if (pendingTimer) { clearTimeout(pendingTimer); pendingResourceValueSaves.delete(input); }
      const id = [...(sheet._selectedIds ?? [])][0];
      if (!id) return;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === id);
      if (!component) return;
      const paths = getResourceValuePaths(component);
      const path = input.hasAttribute("data-config-current-value") ? paths.current : paths.max;
      if (!path) return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      sheet._captureHistory();
      await sheet.actor.update({ [`system.${path}`]: value }, { render: false });
      sheet._refreshBoundComponents();
      });
    });
    activateActorAliasListeners(sheet, html, dependencies);
    html.find("[data-table-cell]").on("change", async event => {
      const input = event.currentTarget, componentId = input.closest(".nexus-component")?.dataset.id, index = Number(input.dataset.tableCell);
      if (!componentId || !Number.isInteger(index) || index < 0) return;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId(), layout = layouts[active];
      const component = layout?.components?.find(item => item.id === componentId); if (!component) return;
      sheet._captureHistory(); component.cells ??= []; component.cells[index] = String(input.value).slice(0, 120);
      await sheet._writeLayouts(layouts, active);
    });
    html.find("[data-layout-select]").on("change", event => sheet._switchLayout(event.currentTarget.value));
    html.find("[data-layout-name]").on("change", event => sheet._updateLayoutName(event.currentTarget.value));
    html.find("[data-appearance-panel]").on("click", event => {
      const key = event.currentTarget.dataset.appearancePanel;
      html.find("[data-appearance-panel]").removeClass("active"); html.find("[data-tool-panel]").prop("hidden", true).removeClass("active");
      event.currentTarget.classList.add("active"); html.find(`[data-tool-panel="${key}"]`).prop("hidden", false).addClass("active");
      if (key === "library") {
        const panel = html[0].querySelector(".nexus-library-panel");
        if (panel) { sheet._mountLibrary(panel); sheet._libraryApplyFilter?.(); }
      }
    });
    html.find("[data-layout-setting]").on("change", event => sheet._updateLayoutSetting(event.currentTarget));
    html.find("[data-global-typography]").on("change", event => sheet._updateGlobalTypography(event.currentTarget));
    html.find("[data-inspector-tab]").on("click", event => {
      const tab = event.currentTarget.dataset.inspectorTab;
      const inspector = event.currentTarget.closest(".nexus-component-inspector");
      if (!inspector || !["card", "appearance", "advanced"].includes(tab)) return;
      sheet._componentInspectorTab = tab;
      inspector.querySelectorAll("[data-inspector-tab]").forEach(button => button.classList.toggle("active", button.dataset.inspectorTab === tab));
      inspector.querySelectorAll("[data-inspector-tab-panel]").forEach(panel => { const active = panel.dataset.inspectorTabPanel === tab; panel.hidden = !active; panel.classList.toggle("active", active); });
    });
    html.find("[data-layer-visibility]").on("click", event => { event.preventDefault(); event.stopPropagation(); const [kind,id] = event.currentTarget.dataset.layerVisibility.split(":"); sheet._toggleLayerState(kind,id,"hidden"); });
    html.find("[data-layer-lock]").on("click", event => { event.preventDefault(); event.stopPropagation(); const [kind,id] = event.currentTarget.dataset.layerLock.split(":"); sheet._toggleLayerState(kind,id,"locked"); });
    const libraryPanel = html[0].querySelector(".nexus-library-panel");
    const renderSavedGroups = () => {
      const container=libraryPanel?.querySelector("[data-library-saved-groups]");if(!container)return;
      const groups=game.user?.getFlag?.("nexus","libraryGroups")??[];container.replaceChildren();
      if(!groups.length){const empty=document.createElement("p");empty.className="nexus-library-empty";empty.textContent="Nenhum grupo salvo.";container.append(empty);return;}
      for(const group of groups){
        const button=document.createElement("button");button.type="button";button.className="nexus-library-saved-group";button.dataset.librarySavedGroup=group.id;
        button.title=`${group.name||"Grupo sem nome"} · ${group.components?.length??0} componentes`;
        const preview=document.createElement("span");preview.className="nexus-library-saved-group-preview";preview.setAttribute("aria-hidden","true");
        const members=Array.isArray(group.components)?group.components:[];
        const bounds=members.length?{left:Math.min(...members.map(x=>Number(x.x)||0)),top:Math.min(...members.map(x=>Number(x.y)||0)),right:Math.max(...members.map(x=>(Number(x.x)||0)+Math.max(20,Number(x.w)||COMPONENTS[x.type]?.w||100))),bottom:Math.max(...members.map(x=>(Number(x.y)||0)+Math.max(20,Number(x.h)||COMPONENTS[x.type]?.h||60)))}:{left:0,top:0,right:100,bottom:100};
        const scale=Math.min(82/Math.max(1,bounds.right-bounds.left),82/Math.max(1,bounds.bottom-bounds.top));
        const gridMode=members.length>8||scale<0.12;preview.classList.toggle("is-grid",gridMode);const visible=gridMode?members.slice(0,8):members;
        for(const member of visible){
          const definition=COMPONENTS[member.type]??{},code=String(member.sheetCode??member.sheetContent1??member.resourceLabel??"").trim().toUpperCase();
          const color=member.sheetColor||({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[code]||"";
          const resource=["pv","pm","pe","pv-bar","pm-bar","pe-bar","pv-ring","sheet-resource","resource-meter","asset-meter"].includes(member.type);
          const card=document.createElement("span");card.className="nexus-library-saved-group-card";card.dataset.previewType=member.type||"component";card.classList.toggle("is-resource",resource);
          const title=document.createElement("strong");title.textContent=String(resource?(member.sheetContent1||member.resourceLabel||code||definition.label||"Recurso"):(member.customLabel||member.text||member.sheetContent1||definition.label||"Card")).trim().slice(0,12);card.append(title);
          if(resource){const track=document.createElement("span");track.className="nexus-library-saved-group-track";const fill=document.createElement("i");const current=Number(member.previewCurrent??32),maximum=Math.max(1,Number(member.previewMax??40));fill.style.width=`${clamp(current/maximum*100,0,100)}%`;fill.style.background=color||"var(--nexus-highlight-color,#78b7e8)";track.append(fill);card.append(track);}
          else{const value=document.createElement("small");value.textContent=String(member.text??member.sheetCode??"").trim().slice(0,14);if(value.textContent)card.append(value);}
          card.style.borderColor=member.borderColor||color||"var(--nexus-panel-border,#3c5067)";
          if(gridMode){preview.append(card);continue;}
          card.style.left=(9+((Number(member.x)||0)-bounds.left)*scale)+"px";card.style.top=(9+((Number(member.y)||0)-bounds.top)*scale)+"px";
          card.style.width=Math.max(10,(Number(member.w)||definition.w||100)*scale)+"px";card.style.height=Math.max(10,(Number(member.h)||definition.h||60)*scale)+"px";card.style.background="var(--nexus-panel-surface,#202e3e)";preview.append(card);
        }
        if(members.length>visible.length){const overflow=document.createElement("span");overflow.className="nexus-library-saved-group-overflow";overflow.textContent="+"+(members.length-visible.length);preview.append(overflow);}
        const title=document.createElement("strong");title.textContent=group.name||"Grupo sem nome";
        const count=document.createElement("small");count.textContent=members.length+(members.length===1?" componente":" componentes");button.append(preview,title,count);container.append(button);
      }
    };
    const renderSavedComponents = () => {
      const container=libraryPanel?.querySelector("[data-library-saved-components]");if(!container)return;
      const saved=game.user?.getFlag?.("nexus","libraryComponents")??[];container.replaceChildren();
      if(!saved.length){const empty=document.createElement("p");empty.className="nexus-library-empty";empty.textContent="Nenhum componente salvo.";container.append(empty);return;}
      for(const item of saved){
        const button=document.createElement("button");button.type="button";button.className="nexus-library-personal-card";button.dataset.librarySavedComponent=item.id;
        const stage=document.createElement("span");stage.className="nexus-library-personal-preview";const definition=COMPONENTS[item.type]??{},settings=item.settings??{};
        if(["sheet-resource","pv","pm","pe","pv-bar","pm-bar","pe-bar"].includes(item.type)){
          const code=String(settings.sheetCode??settings.sheetContent1??"PV").toUpperCase(),color=settings.sheetColor||({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[code]||"#d94b4b";
          stage.append(createSheetResourcePreview({label:settings.sheetContent1||code,current:settings.previewCurrent??32,max:settings.previewMax??40,color,showValues:true}));
          fitSheetResourcePreview(stage,{w:78,h:78},78);
        }else if(item.type==="custom-card"){
          const cardPreview=document.createElement("span");cardPreview.className="nexus-library-personal-card-preview";
          const heading=document.createElement("strong");heading.textContent=String(settings.customLabel||"Card").slice(0,24);
          const body=document.createElement("small");body.textContent=String(settings.text??"").slice(0,90);
          cardPreview.append(heading,body);stage.append(cardPreview);
        }else{const glyph=document.createElement("span");glyph.className="nexus-library-personal-glyph";glyph.textContent=String(settings.customLabel||settings.text||definition.label||item.type||"N").trim().slice(0,2).toUpperCase();stage.append(glyph);}
        const label=document.createElement("strong");label.textContent=item.label||definition.label||"Componente";button.append(stage,label);container.append(button);
      }
    };
    const renderSavedLayouts = () => {
      const container=libraryPanel?.querySelector("[data-library-saved-layouts]");if(!container)return;
      const layouts=game.user?.getFlag?.("nexus","libraryLayouts")??[];container.replaceChildren();
      if(!layouts.length){const empty=document.createElement("p");empty.className="nexus-library-empty";empty.textContent="Nenhum layout salvo. Use o ícone de exportação no cabeçalho para salvar o layout atual.";container.append(empty);return;}
      for(const entry of layouts){
        const card=document.createElement("article");card.className="nexus-library-layout-card";card.dataset.librarySavedLayout=entry.id;
        const title=document.createElement("strong");title.textContent=entry.name||"Layout sem nome";
        const layout=entry.layout??{},components=layout.components?.length??0,groups=layout.groups?.length??0;
        const meta=document.createElement("small");meta.textContent=`${components} componentes · ${groups} grupos · ${layout.width??"?"} × ${layout.height??"?"} px`;
        const actions=document.createElement("div");actions.className="nexus-library-layout-actions";
        for(const [label,attribute] of [["Adicionar à ficha","data-library-add-layout"],["Copiar pacote","data-library-copy-layout"],["Exportar JSON","data-library-export-layout"],["Excluir","data-library-delete-layout"]]){
          const button=document.createElement("button");button.type="button";button.textContent=label;button.setAttribute(attribute,entry.id);actions.append(button);
        }
        card.append(title,meta,actions);container.append(card);
      }
    };
    sheet._libraryRenderSavedGroups=renderSavedGroups;
    sheet._libraryRenderSavedLayouts=renderSavedLayouts;
    sheet._libraryRenderPersonalItems=()=>{renderSavedComponents();renderSavedGroups();};
    sheet._libraryRenderPersonalItems();
    renderSavedLayouts();
    const filterLibrary = () => {
      const query=libraryPanel?.querySelector("[data-library-search]")?.value.trim().toLocaleLowerCase("pt-BR")??"";
      const tag=libraryPanel?.querySelector("[data-library-tag]")?.value??"all";
      const scope=sheet._libraryAssetScope??"core";let visible=0;
      libraryPanel?.querySelectorAll("[data-library-asset]").forEach(card=>{
        const text=card.dataset.libraryAsset??"",matchText=!query||text.includes(query),matchTag=tag==="all"||text.includes(tag);
        const matchFolder=card.dataset.libraryCategory===(sheet._libraryFolder??"core");
        card.hidden=scope!=="core"||!(matchText&&matchTag&&matchFolder);if(!card.hidden)visible++;
      });
      const activeSection=libraryPanel?.querySelector("[data-library-section].active")?.dataset.librarySection??"assets";
      const themeCards=[...(libraryPanel?.querySelectorAll("[data-library-theme],[data-library-custom-theme]")??[])];let visibleThemes=0;
      themeCards.forEach(card=>{card.hidden=!!query&&!String(card.dataset.libraryAsset??"").includes(query);if(!card.hidden)visibleThemes++;});
      const flowCards=[...(libraryPanel?.querySelectorAll("[data-library-flow-id]")??[])];let visibleFlows=0;
      const layoutCards=[...(libraryPanel?.querySelectorAll("[data-library-saved-layout]")??[])];let visibleLayouts=0;
      layoutCards.forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase("pt-BR").includes(query);if(!card.hidden)visibleLayouts++;});
      flowCards.forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase("pt-BR").includes(query);if(!card.hidden)visibleFlows++;});
      const personal=libraryPanel?.querySelector("[data-library-personal]");if(personal)personal.hidden=scope!=="personal";
      const assets=libraryPanel?.querySelector("[data-library-assets]");if(assets)assets.hidden=scope!=="core";
      const personalCount=(game.user?.getFlag?.("nexus","libraryComponents")??[]).length+(game.user?.getFlag?.("nexus","libraryGroups")??[]).length;
      libraryPanel?.querySelectorAll("[data-library-saved-component],[data-library-saved-group]").forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase("pt-BR").includes(query);});
      const count=libraryPanel?.querySelector("[data-library-count]");
      if(count)count.textContent=activeSection==="themes"?`${visibleThemes} ${visibleThemes===1?"tema":"temas"}`:activeSection==="flows"?`${visibleFlows} ${visibleFlows===1?"fluxo":"fluxos"}`:activeSection==="layouts"?`${visibleLayouts} ${visibleLayouts===1?"layout":"layouts"}`:scope==="personal"?`${personalCount} ${personalCount===1?"item":"itens"}`:`${visible} ${visible===1?"asset":"assets"}`;
      const heading=libraryPanel?.querySelector("[data-library-list-heading]");if(heading)heading.textContent=scope==="personal"?"Meus componentes e grupos":"Assets disponíveis";
    };
    const resourcePaths = (() => {
      const paths = [];
      const walk = (value, prefix = "", depth = 0) => {
        if (!value || typeof value !== "object" || depth > 5) return;
        for (const [key, child] of Object.entries(value)) {
          if (["__proto__", "prototype", "constructor"].includes(key)) continue;
          const path = prefix ? `${prefix}.${key}` : key;
          if (typeof child === "number" && Number.isFinite(child)) paths.push(path);
          else if (child && typeof child === "object") {
            if (typeof child.value === "number") paths.push(`${path}.value`);
            if (typeof child.max === "number") paths.push(`${path}.max`);
            walk(child, path, depth + 1);
          }
        }
      };
      walk(sheet.actor.system ?? {});
      // Recursos NEXUS são caminhos importantes mesmo quando a ficha ainda não
      // possui valores numéricos inicializados no ator.
      for (const resource of ["pv", "pm", "pe"]) {
        if (getPath(sheet.actor.system ?? {}, `resources.${resource}`) === undefined) continue;
        for (const suffix of ["value", "max"]) if (getPath(sheet.actor.system ?? {}, `resources.${resource}.${suffix}`) !== undefined) paths.push(`resources.${resource}.${suffix}`);
      }
      for (const path of ["attributes.for", "attributes.des", "attributes.sab", "attributes.int", "attributes.car", "attributes.von", "combat.defense", "combat.movement", "combat.desl", "combat.ddr", "combat.mb", "identity.level"]) {
        paths.push(path);
      }
      for (const alias of [...getNativePropertyDefinitions(sheet.actor), ...getAliasDefinitions(sheet.actor)]) {
        const key = safeAliasKey(alias.key); if (!key) continue;
        if (alias.type === "resource") paths.push(`${key}.name`, `${key}.exib`, `${key}.value`, `${key}.max`, `${key}.percentage`);
        else if (alias.type === "attribute") paths.push(`${key}.name`, `${key}.exib`, `${key}.value`, `${key}.checkbonus`, `${key}.roll`);
        else paths.push(key);
      }
      return [...new Set(paths)].filter(path => !["attributes.body", "attributes.mind", "attributes.soul", "identity.name"].some(legacy => path === legacy || path.startsWith(legacy + "."))).sort((a,b) => a.localeCompare(b, "pt-BR"));
    })();
    const componentResourcePathList=html[0].querySelector("[data-resource-path-list]");
    if(componentResourcePathList) componentResourcePathList.replaceChildren(...resourcePaths.map(path=>{const option=document.createElement("option");option.value=path;return option;}));
    const renderLibraryDetails = () => {
      const detail = libraryPanel?.querySelector("[data-library-details]");
      if (!detail || detail.dataset.selectedType !== "sheet-resource") return;
      const settings = {
        label: detail.querySelector("[data-resource-content1]")?.value ?? "PV",
        icon: detail.querySelector("[data-resource-content2]")?.value ?? "❤️",
        current: resolveNexusBinding(sheet.actor, detail.querySelector("[data-resource-current]")?.value || "resources.pv.value").value ?? "—",
        max: resolveNexusBinding(sheet.actor, detail.querySelector("[data-resource-max]")?.value || "resources.pv.max").value ?? "—",
        color: detail.querySelector("[data-resource-color]")?.value || ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[String(detail.querySelector("[data-resource-content1]")?.value || "PV").toUpperCase()] || "#d94b4b",
        trackColor: detail.querySelector("[data-resource-track-color]")?.value || "#080d14",
        orientation: detail.querySelector("[data-resource-orientation]")?.value || "horizontal"
      };
      const livePreview = detail.querySelector("[data-resource-live-preview]");
      updateSheetResourcePreview(livePreview?.querySelector(".nexus-sheet-resource-preview"), settings);
      fitSheetResourcePreview(livePreview, { w: 220, h: 58 }, 160);
    };
    const selectLibraryAsset = card => {
      if (!card) return;
      sheet._librarySelectedType = card.dataset.assetType || null;
      sheet._librarySelectedAssetKey = card.dataset.assetKey || null;
      libraryPanel.querySelectorAll("[data-library-asset]").forEach(item => item.classList.toggle("is-selected", item === card));
      const asset = NEXUS_LIBRARY_CATALOG.assets.find(item => (item.key ?? `${item.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(item)}`) === card.dataset.assetKey) ?? NEXUS_LIBRARY_CATALOG.assets.find(item => item.type === card.dataset.assetType);
      const detail = libraryPanel.querySelector("[data-library-details]");
      if (!detail || !asset) return;
      detail.dataset.selectedType = asset.type;
      detail.dataset.selectedAssetKey = asset.key ?? `${asset.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(asset)}`;
      const pathOptions = resourcePaths.map(path => `<option value="${path.replace(/&/g,"&amp;").replace(/\"/g,"&quot;")}">${path}</option>`).join("");
      if (asset.type === "custom-card") {
        detail.innerHTML = `<div class="nexus-library-detail-heading"><strong class="nexus-library-detail-title">Card de conteúdo</strong></div>
          <div class="nexus-library-config-grid">
            <label>Título<input type="text" maxlength="48" value="Card" data-card-label></label>
            <label>Largura (px)<input type="number" min="80" max="600" step="10" value="220" data-card-width></label>
            <label>Altura (px)<input type="number" min="48" max="500" step="10" value="120" data-card-height></label>
          </div>
          <label class="nexus-library-card-content-label">Conteúdo<textarea rows="4" maxlength="500" placeholder="Escreva o conteúdo do card…" data-card-text></textarea></label>
          <button type="button" data-library-add>Adicionar card ao Canvas</button>`;
        return;
      }
      if (asset.type === "sheet-attribute") {
        detail.innerHTML = `<div class="nexus-library-live-preview is-sheet-attribute"><div class="nexus-sheet-element is-attribute" data-attribute-preview-card><small data-attribute-preview-label>CORPO</small><strong data-attribute-preview-value>3</strong></div></div>
          <div class="nexus-library-config-section"><strong>Atributo</strong>
            <label>Selecionar atributo<select data-attribute-preset><option value="for">Força</option><option value="des">Destreza</option><option value="sab">Sabedoria</option><option value="int">Inteligência</option><option value="car">Carisma</option><option value="von">Vontade</option><option value="custom">Personalizado</option></select></label>
            <label>Nome exibido<input type="text" value="Corpo" data-attribute-label></label>
            <label>Valor de prévia<input type="number" value="3" data-attribute-preview></label>
          </div>
          <div class="nexus-library-content-picker"><label>Propriedade vinculada<input type="text" value="attributes.for" data-attribute-path list="nexus-attribute-paths"></label><datalist id="nexus-attribute-paths">${pathOptions}</datalist></div>
          <button type="button" data-library-add>Adicionar ao Canvas</button>`;
        const preset = detail.querySelector("[data-attribute-preset]");
        const name = detail.querySelector("[data-attribute-label]");
        const path = detail.querySelector("[data-attribute-path]");
        if (asset.template) { preset.value = asset.template.attributePreset ?? "custom"; name.value = asset.template.text ?? asset.label; path.value = asset.template.dataPath ?? ""; }
        const update = () => {
          detail.querySelector("[data-attribute-preview-label]").textContent = name.value.trim().toLocaleUpperCase("pt-BR") || "ATRIBUTO";
          detail.querySelector("[data-attribute-preview-value]").textContent = detail.querySelector("[data-attribute-preview]").value || "0";
        };
        preset.addEventListener("change", () => {
          const map = { for: ["Força", "attributes.for"], des: ["Destreza", "attributes.des"], sab: ["Sabedoria", "attributes.sab"], int: ["Inteligência", "attributes.int"], car: ["Carisma", "attributes.car"], von: ["Vontade", "attributes.von"] };
          if (map[preset.value]) { name.value = map[preset.value][0]; path.value = map[preset.value][1]; }
          update();
        });
        path.addEventListener("input", () => {
          const expected = { for: "attributes.for", des: "attributes.des", sab: "attributes.sab", int: "attributes.int", car: "attributes.car", von: "attributes.von" };
          if (path.value !== expected[preset.value]) preset.value = "custom";
        });
        detail.querySelectorAll("input, nexus-color-picker").forEach(input => input.addEventListener("input", update));
        update();
        return;
      }
      if (asset.type === "sheet-proficiency") {
        detail.innerHTML = `<div class="nexus-library-live-preview is-skill-proficiency"><button type="button" class="nexus-skill-proficiency-toggle is-proficient" disabled><span class="nexus-skill-proficiency-indicator"></span></button></div>
          <div class="nexus-library-config-section"><strong>Vínculo da proficiência</strong><label>Perícia<select data-proficiency-skill></select></label><small>O marcador alterna entre não proficiente e proficiente, seguindo a regra-base do NEXUS.</small></div>
          <button type="button" data-library-add>Adicionar marcador ao Canvas</button>`;
        const select = detail.querySelector("[data-proficiency-skill]");
        for (const skill of NEXUS_SKILLS) {
          const option = document.createElement("option");
          option.value = skill.key;
          option.textContent = `${skill.name} · ${skill.attribute}`;
          select.append(option);
        }
        const initialKey = String(asset.template?.actionPath ?? "").match(/^skills\.([a-zA-Z0-9_-]+)\.proficient$/)?.[1];
        select.value = initialKey && NEXUS_SKILLS.some(skill => skill.key === initialKey) ? initialKey : (NEXUS_SKILLS[0]?.key ?? "");
        return;
      }
      if (asset.type !== "sheet-resource") {
        detail.innerHTML = `<div class="nexus-library-detail-heading"><strong class="nexus-library-detail-title">${asset.label}</strong></div><button type="button" data-library-add>Adicionar à ficha</button>`;
        return;
      }
      detail.innerHTML = `
        <div class="nexus-library-detail-heading"><div><span class="nexus-library-detail-kind">Elemento</span><strong class="nexus-library-detail-title">Barra</strong></div></div>
        <div class="nexus-library-live-preview" data-resource-live-preview></div>
        
        <div class="nexus-library-config-grid">
          <label>Rótulo<input type="text" value="PV" data-resource-content1 ></label>
          <label>Ícone<input type="text" value="❤️" data-resource-content2 ></label>
          <label>Cor do preenchimento<nexus-color-picker value="#3198ce" data-resource-color></nexus-color-picker></label>
          <label>Cor do espaço vazio<nexus-color-picker value="#080d14" data-resource-track-color></nexus-color-picker></label>
          <label>Orientação<select data-resource-orientation><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label>
        </div>
        <div class="nexus-library-content-picker">
          <strong>Conteúdo vinculado</strong>
          <label>Valor atual<select data-resource-current>${resourcePaths.filter(path => !path.endsWith(".max")).map(path => `<option value="${path.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}" ${path === "resources.pv.value" ? "selected" : ""}>${path}</option>`).join("")}</select></label>
          <label>Valor máximo<select data-resource-max>${resourcePaths.filter(path => !path.endsWith(".value")).map(path => `<option value="${path.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}" ${path === "resources.pv.max" ? "selected" : ""}>${path}</option>`).join("")}</select></label>
          
        </div>
        <button type="button" data-library-add>Adicionar ao Canvas</button>`;
      const defaultResourceCode = String(asset.template?.sheetCode ?? asset.template?.sheetContent1 ?? "PV").toUpperCase();
      const defaultResourceColor = asset.template?.sheetColor ?? ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[defaultResourceCode] ?? "#d94b4b";
      const colorField = detail.querySelector("[data-resource-color]"); if (colorField) colorField.value = defaultResourceColor;
      if (asset.template) {
        const code = String(asset.template.sheetCode ?? asset.template.sheetContent1 ?? "PV").toUpperCase();
        const defaults = {
          "[data-resource-content1]": asset.template.sheetContent1 ?? asset.template.sheetCode,
          "[data-resource-current]": asset.template.currentPath,
          "[data-resource-max]": asset.template.maxPath,
          "[data-resource-color]": asset.template.sheetColor ?? ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[code] ?? "#d94b4b",
          "[data-resource-track-color]": asset.template.sheetTrackColor ?? "#080d14",
          "[data-resource-orientation]": asset.template.sheetOrientation ?? "horizontal"
        };
        for (const [selector, value] of Object.entries(defaults)) { const field = detail.querySelector(selector); if (field && value) field.value = value; }
      }
      detail.querySelector("[data-resource-live-preview]")?.append(createSheetResourcePreview({ showValues: true }));
      detail.querySelectorAll("input,select").forEach(input => input.addEventListener("input", renderLibraryDetails));
      detail.querySelectorAll("select, nexus-color-picker").forEach(input => input.addEventListener("change", renderLibraryDetails));
      renderLibraryDetails();
    };
    let libraryFilterFrame = 0;
    const scheduleLibraryFilter = () => {
      if (libraryFilterFrame) return;
      libraryFilterFrame = requestAnimationFrame(() => { libraryFilterFrame = 0; filterLibrary(); });
    };
    libraryPanel?.querySelector("[data-library-search]")?.addEventListener("input", event => {
       sheet._librarySearchQuery = event.currentTarget.value;
       scheduleLibraryFilter();
     });
    libraryPanel?.querySelector("[data-library-tag]")?.addEventListener("change", event => {
       sheet._libraryTagFilter = event.currentTarget.value;
       scheduleLibraryFilter();
     });

    // Os controles da Biblioteca ficam dentro de uma janela ApplicationV2 separada.
    // A delegação nativa no próprio painel acompanha o nó quando ele é movido para
    // essa janela e continua funcionando após atualizações do Canvas.
    libraryPanel?.addEventListener("click", async event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      const customThemeCard = target?.closest("[data-library-custom-theme]");
      if (customThemeCard && libraryPanel.contains(customThemeCard)) {
        event.preventDefault();
        await sheet._applyLibraryCustomTheme(customThemeCard.dataset.libraryCustomTheme);
        return;
      }
      const themeCard = target?.closest("[data-library-theme]");
      if (themeCard && libraryPanel.contains(themeCard)) {
        event.preventDefault();
        await sheet._applyThemePreset(themeCard.dataset.libraryTheme);
        return;
      }

      const copyLibraryButton = target?.closest("[data-library-copy-all]");
      if (copyLibraryButton && libraryPanel.contains(copyLibraryButton)) {
        event.preventDefault();
        await sheet._copyLibraryBackupCode();
        return;
      }
      const importLibraryCodeButton = target?.closest("[data-library-import-all-code]");
      if (importLibraryCodeButton && libraryPanel.contains(importLibraryCodeButton)) {
        event.preventDefault();
        const result = await foundry.applications.api.DialogV2.input({
          window: { title: "Importar Biblioteca completa" },
          content: '<label class="nexus-library-card-content-label">Código NEXUS-LIBRARY/1<textarea name="code" rows="12" spellcheck="false" autocomplete="off"></textarea></label><p>O conteúdo será validado antes de ser adicionado à sua Biblioteca pessoal.</p>',
          ok: { label: "Importar Biblioteca" },
          rejectClose: false
        });
        const code = String(result?.code ?? "").trim();
        if (!code) return;
        try {
          await sheet._importLibraryBackupCode(code);
        } catch (error) {
          console.warn("NEXUS | Código de backup inválido", error);
          ui.notifications?.warn?.(error?.message || "Não foi possível importar o código da Biblioteca.");
        }
        return;
      }

      const exportLibraryButton = target?.closest("[data-library-export-all]");
      if (exportLibraryButton && libraryPanel.contains(exportLibraryButton)) {
        event.preventDefault();
        await sheet._exportLibraryBackupFile();
        return;
      }
      const importLibraryButton = target?.closest("[data-library-import-all-file]");
      if (importLibraryButton && libraryPanel.contains(importLibraryButton)) {
        event.preventDefault();
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = ".json,application/json,text/plain";
        picker.hidden = true;
        picker.addEventListener("change", async () => {
          const file = picker.files?.[0];
          if (!file) { picker.remove(); return; }
          try {
            await sheet._importLibraryBackupFile(file);
          } catch (error) {
            console.warn("NEXUS | Backup de Biblioteca inválido", error);
            ui.notifications?.warn?.(error?.message || "Não foi possível importar o backup da Biblioteca.");
          } finally {
            picker.remove();
          }
        }, { once: true });
        document.body.append(picker);
        picker.click();
        return;
      }

      const saveComponentButton=target?.closest("[data-library-save-component]");
      if(saveComponentButton&&libraryPanel.contains(saveComponentButton)){event.preventDefault();await sheet._saveSelectedLibraryComponent();return;}
      const savedComponentCard=target?.closest("[data-library-saved-component]");
      if(savedComponentCard&&libraryPanel.contains(savedComponentCard)){
        event.preventDefault();
        const saved=(game.user?.getFlag?.("nexus","libraryComponents")??[]).find(item=>item.id===savedComponentCard.dataset.librarySavedComponent);
        const detail=libraryPanel.querySelector("[data-library-details]");if(!saved||!detail)return;
        libraryPanel.querySelectorAll("[data-library-saved-component]").forEach(item=>item.classList.toggle("is-selected",item===savedComponentCard));
        detail.dataset.selectedType="saved-component";detail.dataset.selectedComponentId=saved.id;detail.replaceChildren();
        const heading=document.createElement("div");heading.className="nexus-library-detail-heading";
        const title=document.createElement("strong");title.className="nexus-library-detail-title";title.textContent=saved.label||"Componente salvo";heading.append(title);
        const summary=document.createElement("p");summary.textContent=COMPONENTS[saved.type]?.label||saved.type;
        const add=document.createElement("button");add.type="button";add.dataset.libraryAddSavedComponent="";add.textContent="Adicionar ao Canvas";
        const copy=document.createElement("button");copy.type="button";copy.dataset.libraryCopySavedComponent="";copy.textContent="Copiar pacote";
        const exportFile=document.createElement("button");exportFile.type="button";exportFile.dataset.libraryExportSavedComponent="";exportFile.textContent="Exportar JSON";
        const remove=document.createElement("button");remove.type="button";remove.dataset.libraryDeleteSavedComponent="";remove.textContent="Excluir da biblioteca";
        detail.append(heading,summary,add,copy,exportFile,remove);return;
      }
      const savedFlowCard=target?.closest("[data-library-flow-id]");
      if(savedFlowCard&&libraryPanel.contains(savedFlowCard)){
        event.preventDefault();
        const entry=getInteractionLibrary(sheet.actor).find(item=>item.id===savedFlowCard.dataset.libraryFlowId);
        const detail=libraryPanel.querySelector("[data-library-flow-details]");if(!entry||!detail)return;
        libraryPanel.querySelectorAll("[data-library-flow-id]").forEach(item=>item.classList.toggle("is-selected",item===savedFlowCard));
        detail.dataset.selectedType="saved-flow";detail.dataset.selectedFlowId=entry.id;detail.replaceChildren();
        const heading=document.createElement("div");heading.className="nexus-library-detail-heading";
        const title=document.createElement("strong");title.className="nexus-library-detail-title";title.textContent=entry.name||"Fluxo salvo";heading.append(title);
        const flow=entry.flow??{};
        const summary=document.createElement("p");summary.textContent=`${flow.triggers?.length??0} gatilhos · ${flow.conditions?.length??0} condições · ${flow.actions?.length??0} ações`;
        const status=document.createElement("small");status.className="nexus-library-flow-status";status.textContent=flow.enabled===false?"Desativado":"Ativo";
        const join=document.createElement("p");join.className="nexus-library-flow-join";join.textContent=flow.conditions?.length?(flow.conditionJoin==="any"?"Condição: qualquer uma (OU)":"Condição: todas (E)"):"Sem condições adicionais";
        const makeDetailSection=(label,items,emptyText)=>{
          const section=document.createElement("section");section.className="nexus-library-flow-detail-section";
          const sectionTitle=document.createElement("strong");sectionTitle.textContent=label;section.append(sectionTitle);
          const list=document.createElement("ul");
          if(!items.length){const item=document.createElement("li");item.textContent=emptyText;list.append(item);}
          else for(const value of items){const item=document.createElement("li");item.textContent=value;list.append(item);}
          section.append(list);detail.append(section);
        };
        const eventLabels={click:"Clique esquerdo",doubleClick:"Duplo clique",rightClick:"Clique direito",middleClick:"Clique do meio",pointerDown:"Pressionar botão",pointerUp:"Soltar botão",hover:"Passar o cursor",change:"Alterar valor",submit:"Enviar formulário",focus:"Receber foco",blur:"Perder foco",keyDown:"Tecla pressionada",keyUp:"Tecla solta",interact:"Interação encadeada"};
        const modifierLabels={shift:"Shift",ctrl:"Ctrl",alt:"Alt",meta:"Meta"};
        const operatorLabels={equals:"igual a",notEquals:"diferente de",greaterThan:"maior que",greaterOrEqual:"maior ou igual a",lessThan:"menor que",lessOrEqual:"menor ou igual a",contains:"contém",isEmpty:"está vazio",isNotEmpty:"não está vazio"};
        const actionLabels={roll:"Rolagem",calculate:"Calcular",update:"Atualizar propriedade",open:"Abrir",toggle:"Alternar componente",interact:"Interagir com componente",execute:"Executar operação"};
        const triggerItems=(flow.triggers??[]).map(item=>(eventLabels[item.event]??String(item.event??"Gatilho"))+((item.modifiers??[]).length?" + "+item.modifiers.map(value=>modifierLabels[value]??value).join(" + "):""));
        const conditionItems=(flow.conditions??[]).map(item=>`${item.path||"Propriedade não definida"} ${operatorLabels[item.operator]??item.operator??"igual a"}${["isEmpty","isNotEmpty"].includes(item.operator)?"":` ${String(item.value??"")}`}`);
        const actionItems=(flow.actions??[]).map(item=>{
          const config=item.config??{};const label=actionLabels[item.type]??String(item.type??"Ação");
          const details=item.type==="roll"?(config.mode==="skill"?`Perícia: ${config.skillKey??"não definida"}`:`Fórmula: ${config.formula??"não definida"}`):
            item.type==="calculate"?`Fórmula: ${config.formula??"—"} → ${config.targetPath??"sem destino"}`:
            item.type==="update"?`${config.path??"propriedade não definida"} · ${config.operation??"set"} · ${config.value??"—"}`:
            ["open","toggle","interact"].includes(item.type)?`Destino: ${config.targetId??"não definido"}${item.type==="interact"?` · Evento: ${config.event??"interact"}`:""}`:
            item.type==="execute"?`${config.operation??"operação não definida"}${config.message?` · ${config.message}`:""}`:"";
          return `${item.enabled===false?"Desativada · ":""}${label}${details?` — ${details}`:""}`;
        });
        detail.append(heading,summary,status,join);
        makeDetailSection("Gatilhos",triggerItems,"Nenhum gatilho configurado.");
        makeDetailSection("Condições",conditionItems,"Nenhuma condição: o fluxo depende apenas do gatilho.");
        makeDetailSection("Ações",actionItems,"Nenhuma ação configurada.");
        const actions=document.createElement("div");actions.className="nexus-library-flow-detail-actions";
        const add=document.createElement("button");add.type="button";add.dataset.libraryAddFlow="";add.textContent="Adicionar ao componente selecionado";
        const remove=document.createElement("button");remove.type="button";remove.dataset.libraryDeleteFlow="";remove.className="danger";remove.textContent="Excluir fluxo da biblioteca";
        actions.append(add,remove);detail.append(actions);return;
      }

      const savedGroupCard = target?.closest("[data-library-saved-group]");
      if (savedGroupCard && libraryPanel.contains(savedGroupCard)) {
        event.preventDefault();
        const saved = (game.user?.getFlag?.("nexus", "libraryGroups") ?? []).find(item => item.id === savedGroupCard.dataset.librarySavedGroup);
        const detail = libraryPanel.querySelector("[data-library-details]");
        if (!saved || !detail) return;
        libraryPanel.querySelectorAll("[data-library-saved-group]").forEach(item => item.classList.toggle("is-selected", item === savedGroupCard));
        detail.dataset.selectedGroupId = saved.id;
        detail.dataset.selectedType = "saved-group";
        detail.innerHTML = "";
        const heading = document.createElement("div");
        heading.className = "nexus-library-detail-heading";
        const title = document.createElement("strong");
        title.className = "nexus-library-detail-title";
        title.textContent = saved.name || "Grupo personalizado";
        heading.append(title);
        const summary = document.createElement("p");
        const nestedCount = Array.isArray(saved.groups) ? Math.max(0, saved.groups.length - 1) : 0;
        summary.textContent = `${saved.components?.length ?? 0} componentes · ${nestedCount} subgrupos`;
        const add = document.createElement("button");
        add.type = "button";
        add.dataset.libraryAddGroup = "";
        add.textContent = "Adicionar grupo ao Canvas";
        const copy = document.createElement("button");
        copy.type = "button";
        copy.dataset.libraryCopyGroupCode = "";
        copy.textContent = "Copiar configuração";
        const exportFile = document.createElement("button");
        exportFile.type = "button";
        exportFile.dataset.libraryExportGroupFile = "";
        exportFile.textContent = "Exportar arquivo JSON";
        const remove = document.createElement("button");
        remove.type = "button"; remove.dataset.libraryDeleteSavedGroup = ""; remove.className = "danger"; remove.textContent = "Excluir grupo da biblioteca";
        detail.append(heading, summary, add, copy, exportFile, remove);
        return;
      }

      const assetCard = target?.closest("[data-library-asset]");
      if (assetCard && libraryPanel.contains(assetCard)) {
        event.preventDefault();
        if (!assetCard.dataset.libraryTheme) selectLibraryAsset(assetCard);
        return;
      }

      const copySavedComponentButton=target?.closest("[data-library-copy-saved-component]");
      if(copySavedComponentButton&&libraryPanel.contains(copySavedComponentButton)){
        const id=libraryPanel.querySelector("[data-library-details]")?.dataset.selectedComponentId;
        if(id)await sheet._copyLibraryPackage("component",id);return;
      }
      const exportSavedComponentButton=target?.closest("[data-library-export-saved-component]");
      if(exportSavedComponentButton&&libraryPanel.contains(exportSavedComponentButton)){
        event.preventDefault();
        const id=libraryPanel.querySelector("[data-library-details]")?.dataset.selectedComponentId;
        if(id)await sheet._exportLibraryPackageFile("component",id);return;
      }
      const addSavedComponentButton=target?.closest("[data-library-add-saved-component]");
      if(addSavedComponentButton&&libraryPanel.contains(addSavedComponentButton)){
        const id=libraryPanel.querySelector("[data-library-details]")?.dataset.selectedComponentId;
        if(id)await sheet._addSavedLibraryComponent(id);return;
      }
      const deleteSavedComponentButton=target?.closest("[data-library-delete-saved-component]");
      if(deleteSavedComponentButton&&libraryPanel.contains(deleteSavedComponentButton)){
        const id=libraryPanel.querySelector("[data-library-details]")?.dataset.selectedComponentId;
        if(id)await sheet._deleteSavedLibraryComponent(id);return;
      }
      const saveLayoutButton = target?.closest("[data-library-save-layout]");
      if (saveLayoutButton && libraryPanel.contains(saveLayoutButton)) { event.preventDefault(); await sheet._saveCurrentLayoutToLibrary(); return; }
      const importLayoutButton = target?.closest("[data-library-import-layout]");
      if (importLayoutButton && libraryPanel.contains(importLayoutButton)) {
        event.preventDefault();
        const result = await foundry.applications.api.DialogV2.input({
          window: { title: "Importar layout completo" },
          content: '<label class="nexus-library-card-content-label">Código do layout<textarea name="code" rows="12" spellcheck="false" autocomplete="off"></textarea></label><p>O layout será salvo na Biblioteca pessoal. Depois, use Adicionar à ficha para criar uma nova aba sem substituir a atual.</p>',
          ok: { label: "Importar layout" }, rejectClose: false
        });
        const code = String(result?.code ?? "").trim();
        if (code) { try { await sheet._importSavedLayoutCode(code); } catch (error) { ui.notifications?.warn?.(error?.message || "Não foi possível importar o layout."); } }
        return;
      }
      const addLayoutButton = target?.closest("[data-library-add-layout]");
      if (addLayoutButton && libraryPanel.contains(addLayoutButton)) { event.preventDefault(); await sheet._addSavedLayoutToActor(addLayoutButton.dataset.libraryAddLayout); return; }
      const copyLayoutButton = target?.closest("[data-library-copy-layout]");
      if (copyLayoutButton && libraryPanel.contains(copyLayoutButton)) { event.preventDefault(); await sheet._copyLibraryPackage("layout",copyLayoutButton.dataset.libraryCopyLayout); return; }
      const exportLayoutButton = target?.closest("[data-library-export-layout]");
      if (exportLayoutButton && libraryPanel.contains(exportLayoutButton)) { event.preventDefault(); await sheet._exportLibraryPackageFile("layout",exportLayoutButton.dataset.libraryExportLayout); return; }
      const deleteLayoutButton = target?.closest("[data-library-delete-layout]");
      if (deleteLayoutButton && libraryPanel.contains(deleteLayoutButton)) { event.preventDefault(); await sheet._deleteSavedLibraryLayout(deleteLayoutButton.dataset.libraryDeleteLayout); return; }
      const saveSelectedGroupButton = target?.closest("[data-library-save-selected-group]");
      if (saveSelectedGroupButton && libraryPanel.contains(saveSelectedGroupButton)) {
        event.preventDefault();
        await sheet._saveSelectedGroupToLibrary();
        return;
      }
      const importGroupFileButton = target?.closest("[data-library-import-group-file]");
      if (importGroupFileButton && libraryPanel.contains(importGroupFileButton)) {
        event.preventDefault();
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = ".json,application/json,text/plain";
        picker.hidden = true;
        picker.addEventListener("change", async () => {
          const file = picker.files?.[0];
          if (!file) { picker.remove(); return; }
          try {
            await sheet._importLibraryPackageFile(file);
          } catch (error) {
            ui.notifications?.warn?.(error?.message || "Não foi possível importar o arquivo do grupo.");
          } finally {
            picker.remove();
          }
        }, { once: true });
        document.body.append(picker);
        picker.click();
        return;
      }
      const importGroupButton = target?.closest("[data-library-import-group]");
      if (importGroupButton && libraryPanel.contains(importGroupButton)) {
        event.preventDefault();
        const result = await foundry.applications.api.DialogV2.input({
          window: { title: "Importar pacote NEXUS" },
          content: '<label class="nexus-library-card-content-label">Código do pacote ou grupo antigo<textarea name="code" rows="10" spellcheck="false" autocomplete="off"></textarea></label><p>Componentes, grupos e layouts são reconhecidos automaticamente.</p>',
          ok: { label: "Importar" },
          rejectClose: false
        });
        const code = String(result?.code ?? "").trim();
        if (!code) return;
        try {
          await sheet._importSavedGroupCode(code);
        } catch (error) {
          console.warn("NEXUS | Código de grupo inválido", error);
          ui.notifications?.warn?.(error?.message || "Não foi possível importar este grupo.");
        }
        return;
      }
      const copySavedGroupButton = target?.closest("[data-library-copy-group-code]");
      if (copySavedGroupButton && libraryPanel.contains(copySavedGroupButton)) {
        const id = libraryPanel.querySelector("[data-library-details]")?.dataset.selectedGroupId;
        if (id) await sheet._copySavedGroupCode(id);
        return;
      }
      const exportSavedGroupButton = target?.closest("[data-library-export-group-file]");
      if (exportSavedGroupButton && libraryPanel.contains(exportSavedGroupButton)) {
        event.preventDefault();
        const id = libraryPanel.querySelector("[data-library-details]")?.dataset.selectedGroupId;
        if (id) await sheet._exportSavedGroupFile(id);
        return;
      }
      const deleteSavedGroupButton = target?.closest("[data-library-delete-saved-group]");
      if (deleteSavedGroupButton && libraryPanel.contains(deleteSavedGroupButton)) {
        const id = libraryPanel.querySelector("[data-library-details]")?.dataset.selectedGroupId;
        if (id) await sheet._deleteSavedLibraryGroup(id);
        return;
      }
      const deleteFlowButton = target?.closest("[data-library-delete-flow]");
      if (deleteFlowButton && libraryPanel.contains(deleteFlowButton)) {
        const detail = libraryPanel.querySelector("[data-library-flow-details]");
        const id = detail?.dataset.selectedFlowId;
        if (id) {
          await deleteInteractionFromLibrary(sheet.actor, id);
          libraryPanel.querySelectorAll("[data-library-flow-id]").forEach(card => { if (card.dataset.libraryFlowId === id) card.remove(); });
          if (detail) {
            detail.dataset.selectedFlowId = "";
            detail.replaceChildren();
            const placeholder = document.createElement("div"); placeholder.className = "nexus-library-detail-placeholder";
            const title = document.createElement("strong"); title.textContent = "Fluxo excluído";
            const message = document.createElement("p"); message.textContent = "O fluxo foi removido da biblioteca.";
            placeholder.append(title, message); detail.append(placeholder);
          }
          sheet._libraryApplyFilter?.();
        }
        return;
      }
      const addFlowButton=target?.closest("[data-library-add-flow]");
      if(addFlowButton&&libraryPanel.contains(addFlowButton)){
        const id=libraryPanel.querySelector("[data-library-flow-details]")?.dataset.selectedFlowId;
        const selectedId=[...(sheet._selectedIds??[])][0];
        if(!id||!selectedId||sheet._selectedIds.size!==1){ui.notifications?.warn?.("Selecione um único componente no Canvas antes de inserir um fluxo.");return;}
        const entry=getInteractionLibrary(sheet.actor).find(item=>item.id===id);if(!entry)return;
        const layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),component=layouts[active]?.components?.find(item=>item.id===selectedId);
        if(!component)return;
        if(!applyInteractionEditorCommand(component,"add-library-flow",{template:entry.flow}))return;
        await sheet._writeLayouts(layouts,active);await sheet.render({force:true});return;
      }

      const addGroupButton = target?.closest("[data-library-add-group]");
      if (addGroupButton && libraryPanel.contains(addGroupButton)) {
        event.preventDefault();
        const groupId = libraryPanel.querySelector("[data-library-details]")?.dataset.selectedGroupId;
        if (groupId) await sheet._addSavedGroupToCanvas(groupId);
        return;
      }

      const addButton = target?.closest("[data-library-add]");
      if (!addButton || !libraryPanel.contains(addButton)) return;
      event.preventDefault();

      const addComponent = async (type, options = {}) => {
        if (!COMPONENTS[type]) {
          throw new Error(`Tipo de componente não registrado: ${String(type)}`);
        }
        await sheet._addComponent(type, options);
      };
      try {
        const detail = libraryPanel.querySelector("[data-library-details]");
        const type = detail?.dataset.selectedType;
        if (!type) throw new Error("Nenhum componente da Biblioteca está selecionado.");

        if (type === "custom-card") {
          const template = {
            customLabel: detail.querySelector("[data-card-label]")?.value.trim() || "Card",
            text: detail.querySelector("[data-card-text]")?.value ?? "",
            w: Number(detail.querySelector("[data-card-width]")?.value) || 220,
            h: Number(detail.querySelector("[data-card-height]")?.value) || 120
          };
          await addComponent(type, { template });
          return;
        }

        if (type === "sheet-attribute") {
          const label = detail.querySelector("[data-attribute-label]")?.value.trim() || "Força";
          const path = detail.querySelector("[data-attribute-path]")?.value.trim() || "attributes.for";
          const preset = detail.querySelector("[data-attribute-preset]")?.value || "for";
          const asset = NEXUS_LIBRARY_CATALOG.assets.find(item => item.key === detail.dataset.selectedAssetKey);
          const template = {
            ...clone(asset?.template ?? {}), text: label, dataPath: path,
            attributePreset: preset, sheetCode: label.slice(0, 8).toUpperCase(),
            w: asset?.template?.w ?? 112, h: asset?.template?.h ?? 88
          };
          await addComponent(type, { template });
          return;
        }

        if (type === "sheet-proficiency") {
          const skillKey = detail.querySelector("[data-proficiency-skill]")?.value ?? "";
          const skill = NEXUS_SKILLS.find(item => item.key === skillKey);
          if (!skill) throw new Error("Selecione uma perícia válida.");
          const asset = NEXUS_LIBRARY_CATALOG.assets.find(item => item.key === detail.dataset.selectedAssetKey);
          const template = {
            ...clone(asset?.template ?? {}),
            actionType: "proficiency",
            actionPath: `skills.${skill.key}.proficient`,
            sheetVariant: "proficiency",
            customLabel: "Proficiência",
            showLabel: false,
            w: 44,
            h: 44
          };
          await addComponent(type, { template });
          return;
        }

        if (type !== "sheet-resource") {
          const asset = NEXUS_LIBRARY_CATALOG.assets.find(item =>
            (item.key ?? `${item.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(item)}`) === detail.dataset.selectedAssetKey
          );
          await addComponent(type, { template: clone(asset?.template ?? {}) });
          return;
        }

        const asset = NEXUS_LIBRARY_CATALOG.assets.find(item =>
          (item.key ?? `${item.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(item)}`) === detail.dataset.selectedAssetKey
        );
        const template = {
          sheetVariant: "resource",
          ...(clone(asset?.template ?? {})),
          w: detail.querySelector("[data-resource-orientation]")?.value === "vertical" ? 100 : (Number(asset?.template?.w) || 220),
          h: detail.querySelector("[data-resource-orientation]")?.value === "vertical" ? 190 : (Number(asset?.template?.h) || 58),
          sheetCode: detail.querySelector("[data-resource-content1]")?.value.trim() || "",
          sheetContent1: detail.querySelector("[data-resource-content1]")?.value.trim() || "",
          sheetContent2: detail.querySelector("[data-resource-content2]")?.value.trim() || "",
          sheetColor: detail.querySelector("[data-resource-color]")?.value || "#d94b4b",
          sheetTrackColor: detail.querySelector("[data-resource-track-color]")?.value || "#080d14",
          sheetOrientation: detail.querySelector("[data-resource-orientation]")?.value || "horizontal",
          currentPath: detail.querySelector("[data-resource-current]")?.value.trim() || asset?.template?.currentPath || "resources.pv.value",
          maxPath: detail.querySelector("[data-resource-max]")?.value.trim() || asset?.template?.maxPath || "resources.pv.max",
          dataPath: "",
          text: ""
        };
        await addComponent(type, { template });
      } catch (error) {
        console.error("NEXUS | Falha ao inserir componente pela Biblioteca", error);
        ui.notifications?.error?.("Não foi possível inserir este componente. Consulte o console para detalhes.");
      }
    });

    sheet._libraryApplyFilter = filterLibrary;
    sheet._libraryRestoreSelection = () => {
      if (!libraryPanel || !sheet._librarySelectedType) return;
      const previousAsset = sheet._librarySelectedAssetKey
        ? libraryPanel.querySelector(`[data-asset-key="${CSS.escape(sheet._librarySelectedAssetKey)}"]`)
        : null;
      const fallbackAsset = previousAsset ?? libraryPanel.querySelector(`[data-asset-type="${CSS.escape(sheet._librarySelectedType)}"]`);
      if (fallbackAsset) selectLibraryAsset(fallbackAsset);
    };
    filterLibrary();
    // Organização por comandos: a hierarquia não depende de arrastar linhas.
    const layerList = html[0]?.querySelector(".nexus-layer-list");
    if (layerList && !layerList.querySelector("[data-layer-parent-select]")) {
      const toolbar = document.createElement("div");
      toolbar.className = "nexus-layer-commands";
      toolbar.innerHTML = `
        <label class="nexus-layer-destination">
          <span>Mover seleção para</span>
          <select data-layer-parent-select aria-label="Grupo de destino">
            <option value="">Canvas (raiz)</option>
          </select>
        </label>
        <div class="nexus-layer-command-buttons">
          <button type="button" data-layer-command="move" title="Mover para o grupo escolhido">Mover</button>
          <button type="button" data-layer-command="raise" title="Trazer para frente">↑</button>
          <button type="button" data-layer-command="lower" title="Enviar para trás">↓</button>
        </div>`;
      layerList.before(toolbar);
      const destination = toolbar.querySelector("[data-layer-parent-select]");
      const refreshDestinations = () => {
        const current = destination.value;
        const groups = sheet._currentLayout?.groups ?? [];
        const selectedGroupId = sheet._selectedGroupId;
        const hierarchy = sheet._groupHierarchy;
        const excluded = new Set();
        for (const id of sheet._selectedIds ?? []) {
          const groupId = hierarchy?.componentOwner?.get(String(id));
          if (groupId) excluded.add(groupId);
        }
        if (selectedGroupId) {
          excluded.add(selectedGroupId);
          for (const id of hierarchy?.descendants?.get(String(selectedGroupId)) ?? []) {
            const nested = hierarchy?.componentOwner?.get(String(id));
            if (nested) excluded.add(nested);
          }
          let changed = true;
          while (changed) { changed = false; for (const group of groups) if (excluded.has(String(group.parentGroupId)) && !excluded.has(String(group.id))) { excluded.add(String(group.id)); changed = true; } }
        }
        destination.replaceChildren(new Option("Canvas (raiz)", ""));
        const byParent = new Map();
        for (const group of groups) {
          const parent = String(group.parentGroupId ?? "");
          if (!byParent.has(parent)) byParent.set(parent, []);
          byParent.get(parent).push(group);
        }
        const append = (parentId, depth) => {
          for (const group of byParent.get(parentId) ?? []) {
            if (excluded.has(String(group.id))) continue;
            const option = new Option(`${"— ".repeat(depth)}${group.name || "Grupo"}`, String(group.id));
            destination.add(option);
            append(String(group.id), depth + 1);
          }
        };
        append("", 0);
        if ([...destination.options].some(option => option.value === current)) destination.value = current;
      };
      toolbar._refreshDestinations = refreshDestinations;
      refreshDestinations();
      toolbar.addEventListener("click", async event => {
        const button = event.target.closest("[data-layer-command]");
        if (!button) return;
        event.preventDefault();
        const selected = sheet._selectedGroupId ? [sheet._selectedGroupId] : [...(sheet._selectedIds ?? [])];
        if (!selected.length) { ui.notifications?.info?.("Selecione um grupo ou componente na árvore."); return; }
        if (button.dataset.layerCommand === "move") {
          await sheet._setLayerParent(selected, destination.value);
        } else if (button.dataset.layerCommand === "raise") {
          await sheet._changeLayer("front");
        } else if (button.dataset.layerCommand === "lower") {
          await sheet._changeLayer("back");
        }
      });
    }
    html.find("[data-layer-group]").on("click", event => {
      if(event.target.closest("[data-layer-disclosure]")){
        event.preventDefault();event.stopPropagation();
        const id=event.currentTarget.dataset.layerGroup, folder=event.currentTarget.closest(".nexus-layer-folder");
        sheet._collapsedLayerGroups??=new Set();
        if(sheet._collapsedLayerGroups.has(id))sheet._collapsedLayerGroups.delete(id);else sheet._collapsedLayerGroups.add(id);
        const collapsed=sheet._collapsedLayerGroups.has(id), depth=Number(folder?.dataset.layerDepth)||0;
        const icon=event.currentTarget.querySelector("[data-layer-disclosure]");
        if(icon)icon.textContent=collapsed?"▸":"▾";
        let next=folder?.nextElementSibling;
        while(next){
          const nextDepth=Number(next.dataset.layerDepth)||0;
          if(nextDepth<=depth)break;
          next.hidden=collapsed;
          next=next.nextElementSibling;
        }
        return;
      }
      sheet._nexusInteractionActive = false;
      const group=(sheet._currentLayout?.groups??[]).find(g=>g.id===event.currentTarget.dataset.layerGroup);
      if (!group) return;
      const groupIds = sheet._groupHierarchy?.descendants.get(String(group.id)) ?? group.componentIds ?? [];
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        const next = new Set(sheet._selectedIds ?? []);
        const alreadySelected = groupIds.length > 0 && groupIds.every(id => next.has(id));
        for (const id of groupIds) alreadySelected ? next.delete(id) : next.add(id);
        sheet._selectedGroupId = null;
        sheet._setSelection(html, [...next]);
        return;
      }
      sheet._selectedGroupId=group.id;
      sheet._setSelection(html, groupIds);
    });
    // Renomear pelo duplo clique no nome, sem abrir o editor de componentes.
    html.find(".nexus-layer-list").on("dblclick", ".nexus-layer-name", event => {
      event.preventDefault(); event.stopPropagation();
      const nameNode=event.currentTarget, row=nameNode.closest("[data-layer-group], [data-layer-select]");
      if(!row) return;
      const id=row.dataset.layerGroup || row.dataset.layerSelect;
      const kind=row.dataset.layerGroup ? "group" : "component";
      sheet._beginLayerRename(nameNode, kind, id);
    });
    html.find("[data-layer-select], [data-layer-group]").on("dblclick", event => {
      if (event.target.closest(".nexus-layer-name")) return;
      event.preventDefault();
      const row=event.currentTarget, groupId=row.dataset.layerGroup;
      if(groupId){const group=(sheet._currentLayout?.groups??[]).find(item=>item.id===groupId);sheet._selectedGroupId=groupId;sheet._setSelection(html,sheet._groupHierarchy?.descendants.get(String(groupId))??group?.componentIds??[]);}
      else sheet._setSelection(html,[row.dataset.layerSelect]);
      const portal=document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);portal?.querySelector('[data-floating-panel="component"]')?.click();
    });
    // A árvore usa seleção e comandos explícitos; não habilitar HTML drag-and-drop.
    html.find("[data-layer-select], [data-layer-group]").removeAttr("draggable");
    const persistInteractionEditor = async (control, command = null, options = {}) => {
      const componentId = control.dataset.componentId || control.closest("[data-interaction-editor], [data-property-presentation-editor]")?.dataset.componentId;
      const interactionId = control.dataset.interactionId || "";
      if (!componentId) return;
      const editor = control.closest("[data-interaction-editor]") || sheet._nexusPanelWindows?.get("behavior")?.panel?.querySelector("[data-interaction-editor]");
      let activeInteractionId = editor?.dataset.activeInteractionId || interactionId;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId(), component = layouts[active]?.components?.find(item => item.id === componentId);
      if (!component) return;
      if (options.captureHistory !== false) sheet._captureHistory();
      const data = { interactionId, componentId, triggerIndex: control.dataset.triggerIndex, conditionIndex: control.dataset.conditionIndex, actionIndex: control.dataset.actionIndex, ruleIndex: control.dataset.ruleIndex, direction: control.dataset.direction, sourcePath: control.dataset.sourcePath };
      if (command === "save-flow") {
        const flow = getComponentInteractions(component).find(item => item.id === interactionId);
        if (!flow) return;
        await saveInteractionToLibrary(sheet.actor, flow);
        ui.notifications?.info?.("Fluxo salvo na Biblioteca.");
      } else if (command === "add-library-flow") {
        const template = getInteractionLibrary(sheet.actor).find(item => item.id === control.dataset.templateId);
        if (!template) { ui.notifications?.warn?.("Selecione um fluxo salvo na Biblioteca."); return; }
        applyInteractionEditorCommand(component, command, { ...data, template: template.flow });
      } else if (command === "clear-key") {
        applyInteractionEditorChange(component, { ...data, scope: "trigger", field: "key" }, "");
        applyInteractionEditorChange(component, { ...data, scope: "trigger", field: "modifiers" }, []);
      } else if (command) applyInteractionEditorCommand(component, command, data);
      else applyInteractionEditorChange(component, { ...data, scope: control.dataset.interactionScope, field: control.dataset.interactionField }, control.type === "checkbox" ? control.checked : control.value);
      if (control.dataset.capturedModifiers !== undefined) applyInteractionEditorChange(component, { ...data, scope: "trigger", field: "modifiers" }, control.dataset.capturedModifiers ? control.dataset.capturedModifiers.split("+") : []);
      if (command === "add-flow" || command === "add-library-flow") activeInteractionId = component.interactions?.at(-1)?.id ?? activeInteractionId;
      if (command === "remove-flow" && activeInteractionId === interactionId) activeInteractionId = component.interactions?.[0]?.id ?? "";
      if (command !== "save-flow") {
        await sheet._writeLayouts(layouts, active, { render: false });
        const liveComponent = sheet._currentLayout?.components?.find(item => item.id === componentId);
        if (liveComponent && Array.isArray(component.interactions)) liveComponent.interactions = structuredClone(component.interactions);
        if (liveComponent) {
          const node = sheet.element?.querySelector?.(`.nexus-component[data-id="${CSS.escape(componentId)}"]`);
          const hasClick = getTriggeredActions(liveComponent, "click", { actor: sheet.actor }).length > 0;
          const hasKeyboard = getComponentInteractions(liveComponent).some(flow => flow.enabled && flow.triggers.some(trigger => ["keyDown", "keyUp"].includes(trigger.event) && !!String(trigger.key ?? "").trim()) && flow.actions.some(action => action.enabled));
          const isInteractive = hasClick || hasKeyboard;
          if (node) {
            node.dataset.hasClickInteraction = String(hasClick);
            node.dataset.hasKeyboardInteraction = String(hasKeyboard);
            node.classList.toggle("is-actionable", hasClick);
            node.classList.toggle("is-rollable", hasClick);
            node.classList.toggle("is-keyboard-actionable", hasKeyboard);
            if (isInteractive) { node.tabIndex = 0; node.setAttribute("role", "button"); node.setAttribute("aria-label", "Executar interação do componente"); }
            else { node.removeAttribute("tabindex"); node.removeAttribute("role"); node.removeAttribute("aria-label"); }
          }
        }
      }
      if (control.dataset.interactionScope?.startsWith("propertyPresentation") || command?.includes("property-rule") || control.dataset.interactionScope?.startsWith("representation") || command?.includes("representation-rule")) {
        const liveComponent = sheet._currentLayout?.components?.find(item => item.id === componentId);
        if (liveComponent) { if (component.propertyPresentation) liveComponent.propertyPresentation = structuredClone(component.propertyPresentation); else if (component.representation) liveComponent.propertyPresentation = structuredClone(component.representation); }
        sheet._refreshBoundComponents?.();
      }
      const propertyEditor = control.closest("[data-property-presentation-editor]");
      if (propertyEditor && options.render !== false) {
        const scrollTop = propertyEditor.scrollTop;
        renderPropertyPresentationEditor(propertyEditor, component, component.dataPath ?? "");
        propertyEditor.dataset.componentId = componentId;
        propertyEditor.scrollTop = scrollTop;
        const next = [...propertyEditor.querySelectorAll("[data-interaction-field]")].find(item =>
          item.dataset.interactionScope === control.dataset.interactionScope &&
          item.dataset.interactionField === control.dataset.interactionField &&
          item.dataset.ruleIndex === control.dataset.ruleIndex
        );
        next?.focus({ preventScroll: true });
      }
      const behaviorEditor = options.render === false ? null : editor;
      if (behaviorEditor) {
        behaviorEditor.dataset.activeInteractionId = activeInteractionId;
        const scrollContainer = behaviorEditor.closest(".nexus-behavior-editor");
        const scrollTop = scrollContainer?.scrollTop ?? behaviorEditor.scrollTop;
        const focusData = { scope: control.dataset.interactionScope, field: control.dataset.interactionField, interactionId, triggerIndex: control.dataset.triggerIndex, conditionIndex: control.dataset.conditionIndex, actionIndex: control.dataset.actionIndex, selectionStart: typeof control.selectionStart === "number" ? control.selectionStart : null, selectionEnd: typeof control.selectionEnd === "number" ? control.selectionEnd : null, selectionDirection: control.selectionDirection ?? "none" };
        renderInteractionEditor(behaviorEditor, component, layouts[active]?.components ?? [], getInteractionLibrary(sheet.actor), sheet.actor);
        behaviorEditor.dataset.componentId = componentId;
        if (scrollContainer) scrollContainer.scrollTop = scrollTop;
        else behaviorEditor.scrollTop = scrollTop;
        const nextControl = [...behaviorEditor.querySelectorAll("[data-interaction-field]")].find(item =>
          item.dataset.interactionScope === focusData.scope &&
          item.dataset.interactionField === focusData.field &&
          item.dataset.interactionId === focusData.interactionId &&
          item.dataset.triggerIndex === focusData.triggerIndex &&
          item.dataset.conditionIndex === focusData.conditionIndex &&
          item.dataset.actionIndex === focusData.actionIndex
        );
        nextControl?.focus({ preventScroll: true });
        if(nextControl && focusData.selectionStart !== null && typeof nextControl.setSelectionRange === "function") nextControl.setSelectionRange(focusData.selectionStart, focusData.selectionEnd ?? focusData.selectionStart, focusData.selectionDirection);
      }
    };
    $(document).on(`keydown${inspectorNamespace}`, event => {
      const capture = document.querySelector(".nexus-interaction-trigger-row [data-interaction-action='capture-key'].is-capturing");
      if (!capture) return;
      if (event.key === "Escape") { capture.classList.remove("is-capturing"); capture.textContent = capture.dataset.capturedKey || "Definir tecla…"; event.preventDefault(); return; }
      if (["Control","Shift","Alt","Meta"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
      const modifiers = [event.ctrlKey ? "ctrl" : null, event.shiftKey ? "shift" : null, event.altKey ? "alt" : null, event.metaKey ? "meta" : null].filter(Boolean);
      capture.dataset.capturedKey = event.key;
      capture.dataset.capturedModifiers = modifiers.join("+");
      capture.classList.remove("is-capturing");
      capture.textContent = [...modifiers.map(value => value.toUpperCase()), event.key === " " ? "Space" : event.key].join(" + ");
      persistInteractionEditor(capture, null);
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-behavior-editor [data-interaction-flow-tab]", event => {
      event.preventDefault(); event.stopPropagation();
      const tab=event.currentTarget,editor=tab.closest("[data-interaction-editor]"),flowId=tab.dataset.interactionFlowTab;
      if(!editor||!flowId)return;
      editor.dataset.activeInteractionId=flowId;
      editor.querySelectorAll("[data-interaction-flow-tab]").forEach(item=>{
        const active=item===tab;item.classList.toggle("active",active);item.setAttribute("aria-selected",String(active));
      });
      editor.querySelectorAll("[data-interaction-flow-panel]").forEach(panel=>{panel.hidden=panel.dataset.interactionFlowPanel!==flowId;});
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-behavior-editor [data-interaction-action], .nexus-component-inspector [data-interaction-action]", async event => {
      event.preventDefault(); event.stopPropagation();
      const button=event.currentTarget;
      if(button.dataset.interactionAction==="capture-key"){
        const active=button.classList.contains("is-capturing");
        document.querySelectorAll(".nexus-interaction-trigger-row .is-capturing").forEach(item=>{item.classList.remove("is-capturing");item.textContent=item.dataset.capturedKey||"Definir tecla…";});
        if(!active){button.classList.add("is-capturing");button.textContent="Pressione uma tecla…";button.focus();}
        return;
      }
      if(button.dataset.interactionAction==="add-library-flow"){
        const select=button.parentElement?.querySelector("[data-interaction-library-select]");
        button.dataset.templateId=select?.value??"";
      }
      await persistInteractionEditor(button, button.dataset.interactionAction);
    });
    $(document).on(`input${inspectorNamespace}`, "[data-property-presentation-editor] [data-interaction-scope^='propertyPresentation']", event => {
      const control = event.currentTarget;
      const componentId = control.dataset.componentId || control.closest("[data-property-presentation-editor]")?.dataset.componentId;
      const component = sheet._currentLayout?.components?.find(item => item.id === componentId);
      if (!component) return;
      if (control.dataset.nexusPresentationHistoryCaptured !== "true") {
        sheet._captureHistory();
        control.dataset.nexusPresentationHistoryCaptured = "true";
      }
      applyInteractionEditorChange(component, {
        scope: control.dataset.interactionScope,
        interactionId: control.dataset.interactionId || "",
        ruleIndex: control.dataset.ruleIndex,
        field: control.dataset.interactionField
      }, control.type === "checkbox" ? control.checked : control.value);
      sheet._refreshBoundComponents?.();
    });
    $(document).on(`change${inspectorNamespace}`, ".nexus-behavior-editor [data-interaction-field], .nexus-component-inspector [data-interaction-field], [data-property-presentation-editor] [data-interaction-scope^='propertyPresentation']", async event => {
      const control = event.currentTarget;
      event.stopPropagation();
      const isPresentationField = control.dataset.interactionScope?.startsWith("propertyPresentation");
      const historyAlreadyCaptured = control.dataset.nexusPresentationHistoryCaptured === "true";
      await persistInteractionEditor(control, null, {
        render: !isPresentationField,
        captureHistory: !isPresentationField || !historyAlreadyCaptured
      });
      if (isPresentationField) delete control.dataset.nexusPresentationHistoryCaptured;
    });
    const getTextStyleTarget = () => sheet._textStyleTarget === "heading" ? "heading" : "content";
    const getInspectorComponent = element => {
      const inspector = element?.closest?.(".nexus-component-inspector");
      const id = inspector?.querySelector("[data-component-setting]")?.dataset.componentTargetId || sheet._componentEditorTargetId || [...(sheet._selectedIds ?? [])][0];
      return (sheet._currentLayout?.components ?? []).find(component => component.id === id) ?? null;
    };
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-target]", event => {
      event.preventDefault(); sheet._textStyleTarget = event.currentTarget.dataset.textStyleTarget;
      const component = getInspectorComponent(event.currentTarget); sheet._syncTextToolbar(event.currentTarget.closest(".nexus-component-inspector"), component);
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-command]", async event => {
      event.preventDefault(); const button = event.currentTarget, component = getInspectorComponent(button); if (!component) return;
      const target = getTextStyleTarget(), style = component[target + "Style"] ?? {}, command = button.dataset.textStyleCommand;
      let key = "", value;
      if (command === "bold") { key = "fontWeight"; value = Number(style.fontWeight ?? 400) >= 600 ? "400" : "700"; }
      else if (command === "italic") { key = "fontStyle"; value = style.fontStyle === "italic" ? "normal" : "italic"; }
      else if (command === "underline") { key = "textDecoration"; value = style.textDecoration === "underline" ? "none" : "underline"; }
      else if (command.startsWith("align-")) { key = "textAlign"; value = command.slice(6); }
      else if (command === "transform") { key = "textTransform"; value = ({ none: "uppercase", uppercase: "lowercase", lowercase: "capitalize", capitalize: "none" })[style.textTransform ?? "none"]; }
      if (key) await sheet._setComponentTextStyle(component.id, target, key, value);
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-menu-toggle]", event => { event.preventDefault(); const menu = event.currentTarget.closest(".nexus-text-toolbar")?.querySelector("[data-text-style-font-menu]"); if (menu) menu.hidden = !menu.hidden; });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-font]", async event => {
      event.preventDefault(); const component = getInspectorComponent(event.currentTarget); if (!component) return;
      await sheet._setComponentTextStyle(component.id, getTextStyleTarget(), "fontFamily", event.currentTarget.dataset.textStyleFont);
      const menu = event.currentTarget.closest("[data-text-style-font-menu]"); if (menu) menu.hidden = true;
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-advanced-toggle]", event => { event.preventDefault(); const panel = event.currentTarget.closest(".nexus-text-tools")?.querySelector("[data-text-style-advanced]"); if (panel) panel.hidden = !panel.hidden; });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-size]", async event => { const component = getInspectorComponent(event.currentTarget); if (component) await sheet._setComponentTextStyle(component.id, getTextStyleTarget(), "fontSize", event.currentTarget.value); });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-color]", async event => { const component = getInspectorComponent(event.currentTarget); if (component) await sheet._setComponentTextStyle(component.id, getTextStyleTarget(), "color", event.currentTarget.value); });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-field]", async event => { const component = getInspectorComponent(event.currentTarget); if (component) await sheet._setComponentTextStyle(component.id, getTextStyleTarget(), event.currentTarget.dataset.textStyleField, event.currentTarget.value); });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-actor-portrait]", event => sheet._updateSystemValue(event.currentTarget));
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-sync-token-portrait]", async event => {
      event.preventDefault();
      const id = event.currentTarget.dataset.componentTargetId || sheet._componentEditorTargetId || [...(sheet._selectedIds ?? [])][0];
      await sheet._syncActorPortraitFromToken(id);
    });
    activateActorPropertyPickerListeners(sheet, inspectorNamespace, { collectPropertyPaths, getNativePropertyDefinitions, getAliasDefinitions, safeAliasKey, getNexusRollAliasEntries, buildPropertyPickerCatalog, renderPropertyPicker });
    $(document).on(`input${inspectorNamespace}`, ".nexus-component-inspector [data-component-setting]", event => {
      const input = event.currentTarget;
      const panelWindow = input.closest(".nexus-panel-window");
      if (panelWindow && panelWindow.id !== `nexus-${sheet.id}-component`) return;
      const id = input.dataset.componentTargetId || sheet._componentEditorTargetId || [...(sheet._selectedIds ?? [])][0];
      const node = id ? sheet.element?.querySelector(`.nexus-component[data-id="${CSS.escape(id)}"]`) : null;
      if (!node) return;
      const key = input.dataset.componentSetting, value = input.value;
      const styles = { backgroundColor: "--nexus-component-bg", borderColor: "--nexus-component-border", fontSize: "--nexus-component-font-size", fontFamily: "--nexus-component-font-family", textAlign: "--nexus-component-text-align", fontWeight: "--nexus-component-font-weight", fontStyle: "--nexus-component-font-style", textTransform: "--nexus-component-text-transform", letterSpacing: "--nexus-component-letter-spacing", lineHeight: "--nexus-component-line-height" };
      if (styles[key]) node.style.setProperty(styles[key], key === "fontSize" || key === "letterSpacing" ? `${value}${key === "fontSize" ? "px" : "px"}` : value);
      if (key === "borderRadius") node.style.setProperty("--nexus-component-radius", `${value}px`);
      if (key === "opacity") node.style.setProperty("--nexus-component-opacity", `${value}%`);
      if (key === "labelPosition") node.dataset.labelPosition = value;
      if (key === "customLabel") { const heading = node.querySelector(".nexus-component-heading"); if (heading) heading.textContent = value; }
      if (key === "text" && node.dataset.type === "custom-card") { const content = node.querySelector(".nexus-custom-card-value"); if (content) content.textContent = value; }
    });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-component-setting]", async event => {
      const panelWindow = event.currentTarget.closest(".nexus-panel-window");
      if (panelWindow && panelWindow.id !== `nexus-${sheet.id}-component`) return;
      const input=event.currentTarget, key=input.dataset.componentSetting, id=input.dataset.componentTargetId || sheet._componentEditorTargetId || [...(sheet._selectedIds ?? [])][0];
      const shouldRestoreInputFocus = document.activeElement === input;
      if(!id) return;
      const panelWindowElement = input.closest(".nexus-panel-window");
      const panelInstance = sheet._nexusPanelWindows?.get("component");
      const panelLeft = panelWindowElement?.style.left ?? "";
      const panelTop = panelWindowElement?.style.top ?? "";
      const panelTransform = panelWindowElement?.style.transform ?? "";
      const scrollSnapshot = [".window-content", ".application-content", ".nexus-native-panel-content", ".nexus-tool-panel", ".nexus-component-inspector", ".nexus-behavior-editor"]
        .map(selector => ({ selector, top: panelWindowElement?.querySelector(selector)?.scrollTop ?? 0, left: panelWindowElement?.querySelector(selector)?.scrollLeft ?? 0 }));
      const restoreEditorViewport = ({ focus = false, target: focusTarget = null } = {}) => {
        const restore = () => {
          const currentWindow = sheet._nexusPanelWindows?.get("component")?.element ?? panelInstance?.element ?? panelWindowElement;
          if (!currentWindow) return;
          if (panelLeft) currentWindow.style.setProperty("left", panelLeft, "important");
          if (panelTop) currentWindow.style.setProperty("top", panelTop, "important");
          if (panelTransform) currentWindow.style.setProperty("transform", panelTransform, "important");
          for (const state of scrollSnapshot) {
            const target = currentWindow.querySelector(state.selector);
            if (target) { target.scrollTop = state.top; target.scrollLeft = state.left; }
          }
          if (focus && sheet._componentEditorTargetId === id) {
            const currentInput = focusTarget?.isConnected ? focusTarget : (currentWindow.querySelector(`[data-component-setting="${CSS.escape(key)}"][data-component-target-id="${CSS.escape(id)}"]`) ?? currentWindow.querySelector(`[data-component-setting="${CSS.escape(key)}"]`));
            currentInput?.focus({ preventScroll: true });
          }
        };
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const currentWindow = sheet._nexusPanelWindows?.get("component")?.element ?? panelInstance?.element ?? panelWindowElement;
          const activeNow = document.activeElement;
          const target = currentWindow?.querySelector(`[data-component-setting="${CSS.escape(key)}"][data-component-target-id="${CSS.escape(id)}"]`);
          const mayRestoreFocus = shouldRestoreInputFocus && (!activeNow || activeNow === document.body || activeNow === document.documentElement || activeNow === input || !currentWindow?.contains(activeNow));
          restoreEditorViewport({ focus: mayRestoreFocus, target });
        }));
      };
      // O alvo de edição é persistente e independente do foco/seleção momentânea.
      sheet._componentEditorTargetId = id;
      const layouts=await sheet._readLayouts(), active=sheet._activeLayoutId(), layout=layouts[active];
      const component=layout?.components?.find(item=>item.id===id); if(!component) return;
      if (key === "actorName") {
        const name = String(input.value ?? "").trim().slice(0, 100);
        if (name) await sheet.actor.update({ name });
        return;
      }
      if (key === "updateSource") { component.updateSource = !!input.checked; await sheet._writeLayouts(layouts,active); sheet.render({force:true}); return; }
      sheet._captureHistory();
      if(key==="width") component.w=clamp(Number(input.value)||component.w,20,layout.width);
      else if(key==="height") component.h=clamp(Number(input.value)||component.h,20,layout.height);
      else if(key==="x") component.x=clamp(Number(input.value)||0,0,layout.width-component.w);
      else if(key==="y") component.y=clamp(Number(input.value)||0,0,layout.height-component.h);
      else if(key==="currentPath" || key==="maxPath") { const path=String(input.value).replace(/^system\./,"").trim(); if(!/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path) || path.split(".").some(part=>["__proto__","prototype","constructor"].includes(part))) return; component[key]=path; }
      else if(key==="binding") { component.binding=input.value; component.customBinding = input.value === "custom" ? (component.customBinding || "") : ""; }
      else if(key==="customBinding") { const path=String(input.value).replace(/^system\./, "").trim(); if(path && !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path)) return; component.customBinding=path; }
      else if(key==="resourceLabel") component.resourceLabel=String(input.value).trim().slice(0,24) || "Recurso";
      else if (["sheetContent1", "sheetContent2"].includes(key)) component[key]=String(input.value).slice(0,120);
      else if (["sheetColor", "sheetTrackColor", "tokenFrameColor", "tokenBackgroundColor"].includes(key)) component[key]=input.value;
      else if (key === "tokenFrameMode") component.tokenFrameMode=input.value === "media" ? "media" : "solid";
      else if (key === "tokenFrameSource") { const source=String(input.value).trim().slice(0,2048); component.tokenFrameSource=isMediaSource(source)?source:""; }
      else if (key === "tokenImage") {
        const source=String(input.value ?? "").trim().slice(0,2048);
        const expression=source.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
        const resolved=expression ? resolveNexusBinding(sheet.actor,expression[1]) : null;
        if (source && (expression ? (!resolved?.path || !(isImageSource(resolved.value) || isVideoSource(resolved.value))) : !(isImageSource(source) || isVideoSource(source)))) { ui.notifications?.warn?.("Não foi possível reconhecer a imagem. Informe uma imagem ou uma propriedade de imagem válida."); input.value=component.tokenImage??""; return; }
        if (source) component.tokenImage=expression ? `{{${resolved.path}}}` : source; else delete component.tokenImage;
      }
      else if (key === "tokenOverlay") component.tokenOverlay=String(input.value).slice(0,24);
      else if (key === "tokenFrameWidth") component.tokenFrameWidth=clamp(Number(input.value)||0,0,16);
      else if (key === "tokenShape") component.tokenShape=["circle","rounded","square"].includes(input.value)?input.value:"circle";
      else if (key === "sheetOrientation") component.sheetOrientation=input.value === "vertical" ? "vertical" : "horizontal";
      else if (key === "previewCurrent") component.previewCurrent=Math.max(0, Number(input.value)||0);
      else if (key === "previewMax") component.previewMax=Math.max(1, Number(input.value)||1);
      else if(key==="backgroundColor" || key==="borderColor") component[key]=input.value;
      else if(key==="borderRadius") component.borderRadius=clamp(Number(input.value)||0,0,32);
      else if(key==="opacity") { const opacity=Number(input.value); component.opacity=clamp(Number.isFinite(opacity)?opacity:100,0,100); }
      else if(key==="fontSize") component.fontSize=clamp(Number(input.value)||13,7,48);
      else if(key==="imageFit") component.imageFit=["contain","cover"].includes(input.value)?input.value:"contain";
      else if(key==="imagePosition") component.imagePosition=["center","top","bottom","left","right"].includes(input.value)?input.value:"center";
      else if(key==="imageOpacity") { const opacity=Number(input.value); component.imageOpacity=clamp(Number.isFinite(opacity)?opacity:100,0,100); }
      else if(key==="actionPath") { const path=String(input.value??"").replace(/^system\./,"").trim(); if(path && (!/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path) || path.split(".").some(part=>["__proto__","prototype","constructor"].includes(part)))) return; component.actionPath=path; }
      else if(/^proficiencyLabel[0-3]$/.test(key)) { const index=Number(key.slice(-1)); component.proficiencyLabels ??= ["Nível 0","Nível 1","Nível 2","Nível 3"]; component.proficiencyLabels[index]=String(input.value??"").trim().slice(0,24)||("Nível " + index); }
      else if(key==="textAlign") component.textAlign=["left","center","right","justify"].includes(input.value)?input.value:"center";
      else if(key==="fontWeight") component.fontWeight=["400","500","600","700","800"].includes(String(input.value))?String(input.value):"400";
      else if(key==="fontStyle") component.fontStyle=input.value==="italic"?"italic":"normal";
      else if(key==="textTransform") component.textTransform=["none","uppercase","lowercase","capitalize"].includes(input.value)?input.value:"none";
      else if(key==="letterSpacing") component.letterSpacing=clamp(Number(input.value)||0,-2,12);
      else if(key==="lineHeight") component.lineHeight=clamp(Number(input.value)||1.35,0.8,2.4);
      else if(key==="fontFamily") component.fontFamily=["Inter","Arial","Georgia","Verdana","monospace"].includes(input.value)?input.value:"Inter";
      else if(key==="headingFontSize") { const size=String(input.value??"").trim(); if(size) component.headingFontSize=clamp(Number(size)||10,7,32); else delete component.headingFontSize; }
      else if(key==="headingFontFamily") { if(["Inter","Arial","Georgia","Verdana","monospace"].includes(input.value)) component.headingFontFamily=input.value; else delete component.headingFontFamily; }
      else if(key==="labelPosition") component.labelPosition=["top-left","top-center","side-left"].includes(input.value)?input.value:"top-left";
      else if(key==="format") { component.format=input.value; }
      else if(key==="attributePreset") {
        const presets = { for: ["Força", "attributes.for"], des: ["Destreza", "attributes.des"], sab: ["Sabedoria", "attributes.sab"], int: ["Inteligência", "attributes.int"], car: ["Carisma", "attributes.car"], von: ["Vontade", "attributes.von"] };
        component.attributePreset = input.value;
        if (presets[input.value]) { component.text = presets[input.value][0]; component.dataPath = presets[input.value][1]; }
      }
      else if(key==="actionType") component.actionType = ["roll","proficiency","resource-slider","toggle-component"].includes(input.value) ? input.value : "";
      else if(key==="actionTargetId") component.actionTargetId = String(input.value ?? "").trim().slice(0,100);
      else if(key==="rollFormula") component.rollFormula = String(input.value ?? "").trim().slice(0, 500);
      else if(key==="dataPath") {
        const path = normalizeNexusPropertyPath(String(input.value ?? ""));
        const resolved = resolveNexusBinding(sheet.actor, path);
        const validPath = !!path && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path);
        // Um alias personalizado pode não possuir caminho físico em Actor.system.
        if (path && (!validPath || (!resolved.path && !resolved.alias))) return;
        component.dataPath = path;
        input.value = path;
        if(component.type==="resource-meter"){component.customBinding=path;component.binding="custom";}
      }
      else if(key==="customLabel") { const title=String(input.value).trim().slice(0,48); component.customLabel=title; if (["level","attribute"].includes(COMPONENTS[component.type]?.variant) || ["level","attribute"].includes(component.sheetVariant)) component.text=title; }
      else if(key==="showLabel") component.showLabel=!!input.checked;
      else if(key==="text") component.text=String(input.value).slice(0,500);
      else if(key==="rows") component.rows=clamp(Number(input.value)||3,1,20);
      else if(key==="columns") component.columns=clamp(Number(input.value)||3,1,12);
      else if(key==="placeholder") component.placeholder=String(input.value).slice(0,100);
      await sheet._writeLayouts(layouts,active);
      sheet._componentEditorTargetId = id;
      sheet._selectedIds = new Set([id]);
      restoreEditorViewport();
      if (["actionType", "actionTargetId", "rollFormula", "actionPath", "proficiencyLabel0", "proficiencyLabel1", "proficiencyLabel2", "proficiencyLabel3"].includes(key) || (key === "dataPath" && component.type !== "token") || key === "customLabel" || key === "showLabel" || (key === "text" && component.type === "custom-card")) {
        await sheet.render({ force: true });
        restoreEditorViewport();
        return;
      }
      const visualOnly = ["x","y","fontSize","fontFamily","textAlign","fontWeight","fontStyle","textTransform","letterSpacing","lineHeight","headingFontSize","headingFontFamily","labelPosition","currentPath","maxPath","backgroundColor","borderColor","borderRadius","opacity","sheetContent1","sheetContent2","sheetColor","sheetTrackColor","sheetOrientation","previewCurrent","previewMax","tokenImage","tokenFrameMode","tokenFrameSource","tokenFrameColor","tokenFrameWidth","tokenShape","tokenOverlay","tokenBackgroundColor","imageFit","imagePosition","imageOpacity"].includes(key) || (key === "dataPath" && component.type === "token") || (component.type === "sheet-attribute" && ["attributePreset","text","dataPath"].includes(key));
      if (visualOnly) {
        const node = html[0].querySelector(`.nexus-component[data-id="${id}"]`);
        if (node) {
          if (key === "x") node.style.left = `${component.x}px`;
          if (key === "y") node.style.top = `${component.y}px`;
          if (key === "backgroundColor") node.style.setProperty("--nexus-component-bg", component.backgroundColor);
          if (key === "borderColor") node.style.setProperty("--nexus-component-border", component.borderColor);
          if (key === "borderRadius") node.style.setProperty("--nexus-component-radius", `${component.borderRadius}px`);
          if (key === "opacity") node.style.setProperty("--nexus-component-opacity", `${component.opacity}%`);
          if (key === "fontSize") node.style.setProperty("--nexus-component-font-size", `${component.fontSize}px`);
          if (key === "fontFamily") node.style.setProperty("--nexus-component-font-family", component.fontFamily);
          if (key === "textAlign") node.style.setProperty("--nexus-component-text-align", component.textAlign);
          if (key === "fontWeight") node.style.setProperty("--nexus-component-font-weight", component.fontWeight);
          if (key === "fontStyle") node.style.setProperty("--nexus-component-font-style", component.fontStyle);
          if (key === "textTransform") node.style.setProperty("--nexus-component-text-transform", component.textTransform);
          if (key === "letterSpacing") node.style.setProperty("--nexus-component-letter-spacing", `${component.letterSpacing}px`);
          if (key === "lineHeight") node.style.setProperty("--nexus-component-line-height", component.lineHeight);
          if (key === "headingFontSize") { if (component.headingFontSize) node.style.setProperty("--nexus-component-heading-font-size", `${component.headingFontSize}px`); else node.style.removeProperty("--nexus-component-heading-font-size"); }
          if (key === "headingFontFamily") { if (component.headingFontFamily) node.style.setProperty("--nexus-component-heading-font-family", component.headingFontFamily); else node.style.removeProperty("--nexus-component-heading-font-family"); }
          if (key === "imageFit") node.querySelector(".nexus-asset-image")?.style.setProperty("object-fit", component.imageFit);
          if (key === "imagePosition") node.querySelector(".nexus-asset-image")?.style.setProperty("object-position", component.imagePosition);
          if (key === "imageOpacity") node.querySelector(".nexus-asset-image")?.style.setProperty("opacity", String(component.imageOpacity / 100));
          if (key === "labelPosition") node.dataset.labelPosition = component.labelPosition;
          if (key === "customLabel") { const heading=node.querySelector(".nexus-component-heading"); if(heading) heading.textContent=component.customLabel; }
        }
        const resourceSettings = { label:component.sheetContent1??"PV", icon:component.sheetContent2??"❤️", current:getPath(sheet.actor.system??{},component.currentPath??"resources.pv.value")??"—", max:getPath(sheet.actor.system??{},component.maxPath??"resources.pv.max")??"—", color:component.sheetColor??({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[String(component.sheetCode??component.sheetContent1??"PV").toUpperCase()]??"#d94b4b", trackColor:component.sheetTrackColor??"#080d14", orientation:component.sheetOrientation??"horizontal" };
        if (component.type === "sheet-attribute") {
          const value = getPath(sheet.actor.system ?? {}, component.dataPath ?? "") ?? 0;
          if (node) { const small=node.querySelector("small"), strong=node.querySelector("strong"); if(small)small.textContent=String(component.text??"Atributo"); if(strong)strong.textContent=String(value); }
        }
        if (component.type === "token") {
          const editorPanel = sheet._nexusPanelWindows?.get("component")?.panel ?? html[0];
          const tokenRoots = [node?.querySelector(".nexus-token-subcanvas"), editorPanel?.querySelector("[data-token-preview]")].filter(Boolean);
          for (const tokenRoot of tokenRoots) {
            let image = tokenRoot.querySelector(".nexus-token-portrait");
            const frame = tokenRoot.querySelector(".nexus-token-frame");
            const overlay = tokenRoot.querySelector(".nexus-token-overlay");
            const imageSource = getTokenImageSource(sheet.actor, component, component.dataPath ? resolveNexusBinding(sheet.actor, component.dataPath).value : "");
            const videoImage = isVideoSource(imageSource);
            if (image && (videoImage !== (image.tagName === "VIDEO"))) {
              const replacement = document.createElement(videoImage ? "video" : "img");
              replacement.className = "nexus-token-portrait";
              if (videoImage) { replacement.autoplay = true; replacement.muted = true; replacement.loop = true; replacement.playsInline = true; }
              image.replaceWith(replacement); image = replacement;
            }
            if (image) { image.src = imageSource; if (image.tagName === "VIDEO") image.load(); }
            if (frame) {
              frame.style.borderColor = component.tokenFrameMode === "media" ? "transparent" : (component.tokenFrameColor ?? "#78b7e8");
              frame.style.borderWidth = `${clamp(Number(component.tokenFrameWidth ?? 3),0,16)}px`;
              frame.replaceChildren();
              if (component.tokenFrameMode === "media" && component.tokenFrameSource) {
                const frameVideo = isVideoSource(component.tokenFrameSource);
                const media = document.createElement(frameVideo ? "video" : "img");
                media.className = "nexus-token-frame-media"; media.src = component.tokenFrameSource;
                if (frameVideo) { media.autoplay = true; media.muted = true; media.loop = true; media.playsInline = true; }
                frame.append(media);
              }
            }
            tokenRoot.dataset.shape = component.tokenShape ?? "circle";
            tokenRoot.style.setProperty("--nexus-token-bg", component.tokenBackgroundColor ?? "#202e3e");
            if (overlay) { overlay.textContent = component.tokenOverlay ?? ""; overlay.hidden = !component.tokenOverlay; }
          }
        }
        if (component.type === "sheet-resource") {
          if (node) {
            updateSheetResourcePreview(node.querySelector(".nexus-sheet-resource-preview"), resourceSettings);
            const label=node.querySelector(".nexus-sheet-resource-label"), icon=node.querySelector(".nexus-sheet-resource-icon");
            const setNode=(target,value)=>{if(!target)return;target.replaceChildren();const text=String(value??"").trim();if(isImageSource(text)){const img=document.createElement("img");img.src=text;img.alt="";target.append(img);}else target.textContent=text;target.hidden=!text;};
            setNode(label,resourceSettings.label);setNode(icon,resourceSettings.icon);
            const resourceRoot=node.querySelector(".nexus-sheet-resource");
            if(resourceRoot){resourceRoot.style.setProperty("--nexus-resource-color",resourceSettings.color);resourceRoot.style.setProperty("--nexus-resource-track-color",resourceSettings.trackColor);resourceRoot.classList.toggle("is-vertical",resourceSettings.orientation==="vertical");}
          }
        }
      } else {
        // Keep the inspector window mounted. A full ActorSheet render replaces its
        // source DOM and can detach the floating editor while the user is typing.
        const liveNode = html[0].querySelector(`.nexus-component[data-id="${id}"]`);
        if (liveNode) {
          liveNode.style.width = `${component.w}px`;
          liveNode.style.height = `${component.h}px`;
          if (component.type === "sheet-resource") {
            const current = getPath(sheet.actor.system ?? {}, component.currentPath ?? "resources.pv.value") ?? "—";
            const maximum = getPath(sheet.actor.system ?? {}, component.maxPath ?? "resources.pv.max") ?? "—";
            const previewSettings = { label:component.sheetContent1 ?? "PV", icon:component.sheetContent2 ?? "❤️", current, max:maximum, color:component.sheetColor ?? ({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[String(component.sheetCode??component.sheetContent1??"PV").toUpperCase()]??"#d94b4b", trackColor:component.sheetTrackColor ?? "#080d14", orientation:component.sheetOrientation ?? "horizontal" };
            updateSheetResourcePreview(liveNode.querySelector(".nexus-sheet-resource-preview"), previewSettings);
          } else if (component.type === "sheet-attribute") {
            const value = getPath(sheet.actor.system ?? {}, component.dataPath ?? "") ?? 0;
            const small = liveNode.querySelector("small"), strong = liveNode.querySelector("strong");
            if (small) small.textContent = component.text ?? "Atributo";
            if (strong) strong.textContent = String(value);
          } else if (key === "text") {
            const textNode = liveNode.querySelector(".nexus-component-content, .nexus-sheet-element");
            if (textNode && !textNode.querySelector("input,textarea")) textNode.textContent = component.text;
          }
        }
        sheet._componentEditorTargetId = id;
        sheet._selectedIds = new Set([id]);
      }
      if (key === "width" || key === "height") sheet._refreshBoundComponents?.();
    });
    html.find("[data-group-parent]").on("change", async event => {
      const parentId = String(event.currentTarget.value ?? "");
      const groupId = String(sheet._selectedGroupId ?? "");
      if (!groupId) return;
      const layouts = await sheet._readLayouts();
      const active = sheet._activeLayoutId();
      const layout = layouts[active];
      const groups = layout?.groups ?? [];
      const group = groups.find(item => String(item.id) === groupId);
      if (!group) return;
      if (!validateGroupParent(groups, groupId, parentId)) {
        ui.notifications?.warn?.("Esse destino criaria uma hierarquia inválida. Escolha outro grupo superior.");
        event.currentTarget.value = String(group.parentGroupId ?? "");
        return;
      }
      if (String(group.parentGroupId ?? "") === parentId) return;
      sheet._captureHistory();
      group.parentGroupId = parentId;
      await sheet._writeLayouts(layouts, active);
      sheet._selectedGroupId = groupId;
      sheet._selectedIds = new Set(sheet._groupHierarchy?.descendants.get(groupId) ?? []);
      sheet.render({ force: true });
    });
    html.find("[data-group-setting]").on("change", async event => {
      const input=event.currentTarget,groupId=sheet._selectedGroupId;if(!groupId)return;
      const layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),layout=layouts[active],group=layout?.groups?.find(item=>item.id===groupId);if(!group)return;
      sheet._captureHistory();const key=input.dataset.groupSetting,value=input.type==="checkbox"?input.checked:input.value;
      if(key==="name")group.name=String(value??"").trim().slice(0,48)||"Grupo";
      else if(key==="title")group.title=String(value??"").slice(0,48);
      else if(key==="kind"){group.kind=["folder","container","section"].includes(value)?value:"container";if(group.kind==="section"&&group.showHeader===undefined)group.showHeader=true;}
      else if(key==="layoutMode")group.layoutMode=["free","horizontal","vertical","grid"].includes(value)?value:"free";
      else if(key==="gap"||key==="padding")group[key]=clamp(Number(value)||0,0,120);
      else if(key==="columns")group.columns=clamp(Math.trunc(Number(value)||2),1,12);
      else if(key==="align")group.align=["start","center","end"].includes(value)?value:"start";
      else if(key==="showHeader")group.showHeader=value===true;
      else if(key==="borderRadius")group.borderRadius=clamp(Number(value)||0,0,32);
      else if(key==="backgroundColor"||key==="borderColor")group[key]=String(value);
      sheet._currentLayout=sheet._normalizeLayout(layout);layouts[active]=sheet._currentLayout;
      await sheet._writeLayouts(layouts,active);sheet.render({force:true});
    });
    html.find("[data-component-setting-reset]").on("click", async event => {
      const id = [...(sheet._selectedIds ?? [])][0]; if (!id) return;
      const key = event.currentTarget.dataset.componentSettingReset;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId(), component = layouts[active]?.components?.find(item => item.id === id); if (!component) return;
      sheet._captureHistory(); delete component[key]; await sheet._writeLayouts(layouts, active); sheet.render({ force: true });
    });
    html.find("[data-component-reset]").on("click", async event => {
      const id=[...(sheet._selectedIds??[])][0]; if(!id)return;
      const kind=event.currentTarget.dataset.componentReset;
      const layouts=await sheet._readLayouts(), active=sheet._activeLayoutId(), layout=layouts[active];
      const component=layout?.components?.find(item=>item.id===id); if(!component)return;
      sheet._captureHistory();
      if(kind==="style") for(const key of ["backgroundColor","borderColor","borderRadius","opacity"]) delete component[key];
      if(kind==="typography") { delete component.fontSize; delete component.fontFamily; delete component.headingFontSize; delete component.headingFontFamily; delete component.contentStyle; delete component.headingStyle; delete component.labelPosition; }
      if(kind==="token") { delete component.tokenImage; delete component.tokenFallback; }
      if(kind==="resource") Object.assign(component,{sheetContent1:component.sheetCode??"PV",sheetContent2:({PV:"❤️",PM:"💧",PE:"⚡"})[String(component.sheetCode??"PV").toUpperCase()]??"✦",sheetColor:({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b",REC:"#8b9bad"})[String(component.sheetCode??"PV").toUpperCase()]??"#8b9bad",sheetTrackColor:"#080d14",sheetOrientation:"horizontal",previewCurrent:32,previewMax:40});
      if(kind==="attribute") { Object.assign(component,{text:"Força",dataPath:"attributes.for",attributePreset:"for"}); }
      await sheet._writeLayouts(layouts,active); sheet._currentLayout = layout;
      const componentNode = sheet.element?.querySelector(`.nexus-component[data-id="${CSS.escape(component.id)}"]`);
      if (componentNode && kind === "typography") {
        componentNode.style.setProperty("--nexus-component-font-size", `${layout.fontSize ?? 13}px`);
        componentNode.style.setProperty("--nexus-component-font-family", layout.fontFamily ?? "Inter");
        componentNode.style.removeProperty("--nexus-component-heading-font-size");
        componentNode.style.removeProperty("--nexus-component-heading-font-family");
        componentNode.dataset.labelPosition = "top-left";
        sheet._applyComponentTextStyles(componentNode, component);
      } else if (componentNode) sheet.render({ force: true });
      const inspector = [...(sheet._nexusPanelWindows?.values?.() ?? [])].map(instance => instance.element).find(node => node?.querySelector(".nexus-component-inspector"))?.querySelector(".nexus-component-inspector");
      if (inspector && kind === "typography") sheet._syncTextToolbar(inspector, component);
    });
    html.find("[data-group-reset]").on("click", async () => {
      const groupId=sheet._selectedGroupId;if(!groupId)return;
      const layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),group=layouts[active]?.groups?.find(item=>item.id===groupId);if(!group)return;
      sheet._captureHistory(); delete group.backgroundColor; delete group.borderColor; delete group.borderRadius;
      await sheet._writeLayouts(layouts,active); sheet.render({force:true});
    });
    const appWindow = html[0].closest(".application, .window-app");
    if (appWindow) { appWindow.classList.add("nexus-window"); appWindow.style.setProperty("--nexus-window-accent", sheet._currentLayout?.accentColor ?? "#52647b"); }
    sheet._activateCanvas(html);
    sheet._mountFloatingUI(html);
}
