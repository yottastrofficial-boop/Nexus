import { validateGroupParent } from "../core/group-hierarchy.js";
import { serializeActorPropertyWrite } from "../core/actor-property-writes.js";
import { writeNexusLibraryCollection, updateNexusLibraryCollection } from "../core/library-store.js";
import { createLibraryDefinition, createLibraryComponentInstance, planLibraryDefinitionUpdate } from "../core/library-models.js";
import { getLibraryMediaInsertionSource } from "../library/catalog-explorer.js";
import { applyScopedTheme } from "../core/theme.js";

import { activateActorPropertyValueListeners } from "./actor-property-value-listeners.js";
import { activateActorPropertyPickerListeners } from "./actor-property-picker-listeners.js";
import { activateActorAliasListeners } from "./actor-alias-listeners.js";
import { activateActorSheetSkillListeners } from "./actor-sheet-skill-listeners.js";
import { activateActorSheetResourceListeners } from "./actor-sheet-resource-listeners.js";

function createActorSheetLibraryContext(sheet) {
  sheet._getLibraryBackupService?.();
  const canApplyResource = (resource, resolved) => {
    const reference = resource?.reference ?? {};
    if (sheet.rendered !== true || reference.providerId !== "nexus-library") return false;
    if (["components", "groups", "layouts", "themes", "assets"].includes(reference.collection) || ["asset", "theme"].includes(reference.builtin)) return true;
    return reference.collection === "media" && Boolean(getLibraryMediaInsertionSource(resource, resolved));
  };
  const applyResource = async (resource, resolved) => {
    if (sheet.rendered !== true) {
      ui.notifications?.warn?.("Abra a ficha de destino para inserir este recurso.");
      return false;
    }
    const reference = resource?.reference ?? {};
    if (reference.providerId !== "nexus-library") return false;
    if (reference.collection === "components") return sheet._addSavedLibraryComponent?.(reference.id) ?? false;
    if (reference.collection === "groups") return sheet._addSavedGroupToCanvas?.(reference.id) ?? false;
    if (reference.collection === "layouts") return sheet._addSavedLayoutToActor?.(reference.id) ?? false;
    if (reference.collection === "themes") return sheet._applyLibraryCustomTheme?.(reference.id) ?? false;
    if (reference.builtin === "theme") return sheet._applyThemePreset?.(resolved?.id) ?? false;
    if (reference.collection === "media") {
      const source = getLibraryMediaInsertionSource(resource, resolved);
      if (!source || typeof sheet._addComponent !== "function") return false;
      return sheet._addComponent("asset-image", { template: { dataPath: source } });
    }
    if (reference.collection === "assets" || reference.builtin === "asset") {
      const componentType = String(resolved?.type ?? resolved?.componentType ?? "");
      if (!componentType || typeof sheet._addComponent !== "function") return false;
      return sheet._addComponent(componentType, { format: resolved?.format, template: resolved?.template ?? resolved?.settings ?? {} });
    }
    return false;
  };
  return {
    source: "actor-sheet",
    actorUuid: sheet.actor?.uuid,
    canApplyResource,
    applyResource,
    applyLabel: "Inserir na ficha",
    getUpdateInfo: async (resource, definition) => {
      if (sheet.rendered !== true || resource?.reference?.collection !== "components") return null;
      return planLibraryDefinitionUpdate(definition, await sheet._readLayouts());
    },
    canUpdateDefinition: (resource, definition) => {
      if (sheet.rendered !== true || resource?.reference?.collection !== "components") return false;
      const selectedIds = [...(sheet._selectedIds ?? [])];
      if (selectedIds.length !== 1) return false;
      const component = sheet._currentLayout?.components?.find(item => item.id === selectedIds[0]);
      return component?.libraryDefinitionId === resource.reference.id && component.type === definition?.type;
    },
    updateDefinition: async (resource, definition) => {
      if (sheet.rendered !== true || resource?.reference?.collection !== "components") return false;
      const selectedIds = [...(sheet._selectedIds ?? [])];
      if (selectedIds.length !== 1 || String(definition?.id) !== String(resource.reference.id)) return false;
      const layouts = await sheet._readLayouts();
      const active = sheet._activeLayoutId();
      const layout = layouts[active];
      const componentIndex = layout?.components?.findIndex(item => item.id === selectedIds[0]) ?? -1;
      if (componentIndex < 0) return false;
      const component = layout.components[componentIndex];
      if (component.libraryDefinitionId !== resource.reference.id || component.type !== definition.type) return false;
      const selectedComponentSnapshot = foundry.utils.deepClone(component);
      let updatedDefinition = null;
      await updateNexusLibraryCollection(game.user, "components", entries => {
        const definitionIndex = entries.findIndex(entry => String(entry.id) === String(definition.id));
        if (definitionIndex < 0) throw new Error("A definição original não foi encontrada na Biblioteca.");
        const currentDefinition = entries[definitionIndex];
        const currentVersion = Math.max(1, Number(currentDefinition.version) || 1);
        if (currentVersion !== Math.max(1, Number(definition.version) || 1)) {
          throw new Error("A definição foi alterada desde que o Inspector foi aberto. Reabra o recurso e revise a versão atual.");
        }
        updatedDefinition = createLibraryDefinition({
          id: currentDefinition.id,
          type: currentDefinition.type,
          label: currentDefinition.label,
          version: currentVersion + 1,
          settings: { ...selectedComponentSnapshot },
          metadata: currentDefinition.metadata ?? {},
          history: [
            ...(currentDefinition.history ?? []).filter(entry => Number(entry.version) !== currentVersion),
            { version: currentVersion, settings: currentDefinition.settings ?? {} }
          ]
        });
        const nextEntries = [...entries];
        nextEntries[definitionIndex] = updatedDefinition;
        return nextEntries;
      });
      let latestLayouts;
      try {
        latestLayouts = await sheet._readLayouts();
      } catch (error) {
        ui.notifications?.warn?.("A definição foi salva na Biblioteca, mas a ficha não pôde ser relida. A instância foi preservada: " + error.message);
        return true;
      }
      const latestLayout = latestLayouts[active];
      const latestIndex = latestLayout?.components?.findIndex(item => item.id === selectedIds[0]) ?? -1;
      const latestComponent = latestIndex >= 0 ? latestLayout.components[latestIndex] : null;
      if (!latestComponent || JSON.stringify(latestComponent) !== JSON.stringify(selectedComponentSnapshot)) {
        ui.notifications?.warn?.("A definição foi salva, mas a instância selecionada mudou durante a operação e foi preservada.");
        return true;
      }
      const updatedInstance = createLibraryComponentInstance(updatedDefinition, {
        id: latestComponent.id,
        position: { x: latestComponent.x, y: latestComponent.y }
      });
      for (const key of ["z", "stackOrder"]) if (latestComponent[key] !== undefined) updatedInstance[key] = latestComponent[key];
      sheet._captureHistory?.();
      latestLayout.components[latestIndex] = updatedInstance;
      try {
        await sheet._writeLayouts(latestLayouts, active);
      } catch (error) {
        ui.notifications?.warn?.("A definição foi salva, mas a instância não pôde ser atualizada e foi preservada: " + error.message);
        return true;
      }
      sheet._currentLayout = latestLayout;
      await sheet.render({ force: true });
      ui.notifications?.info?.("Definição atualizada para a versão " + updatedDefinition.version + ".");
      return true;
    },
    updateInstances: async (resource, definition) => {
      if (sheet.rendered !== true || resource?.reference?.collection !== "components") return false;
      const layouts = await sheet._readLayouts();
      const preview = planLibraryDefinitionUpdate(definition, layouts);
      if (!preview.available.length) {
        if (preview.requiresReview.length) ui.notifications?.warn?.("Há instâncias antigas sem snapshot de origem; elas precisam de revisão manual.");
        return false;
      }
      const confirm = foundry.applications.api.DialogV2.confirm;
      const accepted = await confirm({
        window: { title: "Atualizar instâncias deste Actor" },
        content: "<p>" + preview.available.length + " instância(s) vinculadas a esta definição podem receber os novos padrões.</p>" +
          (preview.requiresReview.length ? "<p>" + preview.requiresReview.length + " instância(s) antigas serão preservadas para revisão manual.</p>" : "") +
          "<p>Os valores sobrescritos manualmente e a posição das instâncias serão preservados.</p>",
        yes: { label: "Atualizar instâncias" },
        no: { label: "Cancelar" },
        rejectClose: false
      });
      if (!accepted) return false;
      const plan = planLibraryDefinitionUpdate(definition, layouts, {
        selectedInstanceKeys: preview.available.map(item => item.key)
      });
      if (!plan.updatedCount) return false;
      sheet._captureHistory?.();
      for (const [layoutId, updatedLayout] of Object.entries(plan.layouts)) {
        if (layouts[layoutId] && Array.isArray(updatedLayout?.components)) layouts[layoutId].components = updatedLayout.components;
      }
      await sheet._writeLayouts(layouts, sheet._activeLayoutId());
      sheet._currentLayout = layouts[sheet._activeLayoutId()];
      await sheet.render({ force: true });
      ui.notifications?.info?.(plan.updatedCount + " instância(s) atualizada(s) neste Actor.");
      if (plan.requiresReview.length) ui.notifications?.warn?.(plan.requiresReview.length + " instância(s) antiga(s) precisam de revisão manual.");
      return true;
    }
  };
}

/**
 * Event bindings for the NEXUS Actor Sheet.
 * Kept separate from the sheet class so the lifecycle facade stays focused.
 */
export function activateActorSheetListeners(sheet, html, dependencies) {
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const { NEXUS_LIBRARY_CATALOG, THEME_PALETTES, NEXUS_SKILLS, collectPropertyPaths, getNexusRollAliasEntries, buildPropertyPickerCatalog, renderPropertyPicker, getTriggeredActions, renderInteractionEditor, applyInteractionEditorChange, applyInteractionEditorCommand, getInteractionLibrary, saveInteractionToLibrary, deleteInteractionFromLibrary, getComponentInteractions, renderPropertyPresentationEditor, renderInteractionMediaPreview, COMPONENTS, resolveNexusBinding, normalizeNexusPropertyPath, clone, getPath, getResourceValuePaths, getNativePropertyDefinitions, getAliasDefinitions, safeAliasKey, clamp, isMediaSource, isVideoSource, isImageSource, getTokenImageSource, createSheetResourcePreview, fitSheetResourcePreview, updateSheetResourcePreview } = dependencies;

    const currentRoot = html?.[0];
    const inspectorNamespace = `.nexusInspector${String(sheet.id).replace(/[^a-zA-Z0-9]/g, "")}`;
    sheet._nexusInspectorNamespace = inspectorNamespace;
    // Remove listeners from the previous render before registering the new delegated handlers.
    $(document).off(inspectorNamespace);
    $(document).on(`input${inspectorNamespace}`, ".nexus-behavior-editor [data-interaction-autogrow]", event => {
      const area=event.currentTarget;
      const lineHeight=Number.parseFloat(getComputedStyle(area).lineHeight)||18;
      const maxHeight=lineHeight*5+14;
      area.style.height="auto";
      const nextHeight=Math.min(area.scrollHeight,maxHeight);
      area.style.height=nextHeight+"px";
      area.style.overflowY=area.scrollHeight>maxHeight?"auto":"hidden";
    });
    $(document).on(`input${inspectorNamespace}`, "[data-interaction-media-input], [data-property-value], [data-inspector-media-input]", event => {
      const input = event.currentTarget;
      const preview = input.dataset.interactionMediaInput !== undefined
        ? (input.closest(".nexus-property-presentation-rule")?.querySelector("[data-interaction-media-preview]")
          ?? input.closest(".nexus-interaction-action-config")?.querySelector("[data-interaction-media-preview]"))
        : input.dataset.inspectorMediaInput !== undefined
          ? input.closest("label")?.nextElementSibling
          : input.closest(".nexus-property-value-field")?.nextElementSibling;
      if (preview) renderInteractionMediaPreview(preview, input.value);
    });
    const isSheetOwnedControl = input => currentRoot?.contains(input);
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
        if (input.isConnected && (input.value.trim() === "" || Number.isFinite(Number(input.value)))) $(input).trigger("change");
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
      sheet._refreshBoundComponentsSafely();
      }).catch(() => {});
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
    html.find("[data-open-nexus-library]").on("click", event => {
      event.preventDefault();
      const open = game.nexus?.library?.open;
      if (typeof open !== "function") {
        ui.notifications?.warn?.("A Biblioteca Universal ainda não está disponível.");
        return;
      }
      void open(createActorSheetLibraryContext(sheet)).catch(error => {
        console.error("NEXUS | Falha ao abrir a Biblioteca Universal.", error);
        ui.notifications?.error?.("Não foi possível abrir a Biblioteca Universal.");
      });
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
      sheet._openFloatingPanel?.("component");
    });
    // A árvore usa seleção e comandos explícitos; não habilitar HTML drag-and-drop.
    html.find("[data-layer-select], [data-layer-group]").removeAttr("draggable");
    const persistInteractionEditor = async (control, command = null, options = {}) => {
      const componentId = control.dataset.componentId || control.closest("[data-interaction-editor], [data-property-presentation-editor]")?.dataset.componentId;
      const interactionId = control.dataset.interactionId || "";
      if (!componentId) return;
      const editor = control.closest("[data-interaction-editor]") || sheet.element?.querySelector('[data-tool-panel="behavior"] [data-interaction-editor]');
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
      if (command === "add-flow" || command === "add-library-flow" || command === "duplicate-flow") activeInteractionId = component.interactions?.at(-1)?.id ?? activeInteractionId;
      if (command === "remove-flow" && activeInteractionId === interactionId) activeInteractionId = component.interactions?.[0]?.id ?? "";
      if (command !== "save-flow") {
        await sheet._writeLayouts(layouts, active, { render: false });
        const liveComponent = sheet._currentLayout?.components?.find(item => item.id === componentId);
        if (liveComponent && Array.isArray(component.interactions)) liveComponent.interactions = structuredClone(component.interactions);
        if (liveComponent) {
          const node = sheet.element?.querySelector?.(`.nexus-component[data-id="${CSS.escape(componentId)}"]`);
          const hasClick = getTriggeredActions(liveComponent, "click", { actor: sheet.actor }).length > 0;
          const hasKeyboard = getComponentInteractions(liveComponent).some(flow => flow.enabled && flow.triggers.some(trigger => ["focus", "blur"].includes(trigger.event) || (["keyDown", "keyUp"].includes(trigger.event) && !!String(trigger.key ?? "").trim())) && flow.actions.some(action => action.enabled));
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
    const setShortcutLabel=(button,label)=>{const node=button.querySelector(".nexus-interaction-keycap-label");if(node)node.textContent=label;else button.textContent=label;button.setAttribute("aria-label",label);};
    $(document).on(`keydown${inspectorNamespace}`, event => {
      const capture = document.querySelector(".nexus-interaction-trigger-row [data-interaction-action='capture-key'].is-capturing");
      if (!capture) return;
      if (event.key === "Escape") { capture.classList.remove("is-capturing"); setShortcutLabel(capture, capture.dataset.capturedKey ? [...String(capture.dataset.capturedModifiers||"").split("+").filter(Boolean).map(value=>({ctrl:"Ctrl",shift:"Shift",alt:"Alt",meta:"Meta"}[value]??value)), capture.dataset.capturedKey===" "?"Espaço":capture.dataset.capturedKey].join(" + ") : "Definir combinação…"); event.preventDefault(); return; }
      if (["Control","Shift","Alt","Meta"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
      const modifiers = [event.ctrlKey ? "ctrl" : null, event.shiftKey ? "shift" : null, event.altKey ? "alt" : null, event.metaKey ? "meta" : null].filter(Boolean);
      capture.dataset.capturedKey = event.key;
      capture.dataset.capturedModifiers = modifiers.join("+");
      capture.classList.remove("is-capturing");
      setShortcutLabel(capture, [...modifiers.map(value => ({ctrl:"Ctrl",shift:"Shift",alt:"Alt",meta:"Meta"}[value]??value)), event.key === " " ? "Espaço" : event.key].join(" + "));
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
      if(button.dataset.interactionAction==="edit-flow-name"){
        const editor=button.closest("[data-interaction-editor]");
        const flowId=button.dataset.interactionId;
        const tab=editor?.querySelector(`[data-interaction-flow-tab="${CSS.escape(flowId)}"]`);
        if(!tab)return;
        const previousName=tab.textContent.trim();
        const input=document.createElement("input");
        input.type="text";input.value=previousName;input.maxLength=60;input.setAttribute("aria-label","Nome do fluxo");
        input.dataset.interactionScope="flow";input.dataset.interactionField="name";input.dataset.interactionId=flowId;
        input.dataset.componentId=editor.dataset.componentId??"";
        input.addEventListener("keydown",keyEvent=>{
          if(keyEvent.key==="Enter"){keyEvent.preventDefault();input.blur();}
          if(keyEvent.key==="Escape"){keyEvent.preventDefault();input.value=previousName;input.dataset.cancelRename="true";input.blur();}
        });
        input.addEventListener("blur",async()=>{
          if(input.dataset.cancelRename==="true"||!input.value.trim()){tab.textContent=previousName;return;}
          await persistInteractionEditor(input,null);
        },{once:true});
        tab.replaceChildren(input);input.focus();input.select();
        return;
      }
      if(button.dataset.interactionAction==="capture-key"){
        const active=button.classList.contains("is-capturing");
        document.querySelectorAll(".nexus-interaction-trigger-row .is-capturing").forEach(item=>{item.classList.remove("is-capturing");setShortcutLabel(item,item.dataset.capturedKey?[...String(item.dataset.capturedModifiers||"").split("+").filter(Boolean).map(value=>({ctrl:"Ctrl",shift:"Shift",alt:"Alt",meta:"Meta"}[value]??value)),item.dataset.capturedKey===" "?"Espaço":item.dataset.capturedKey].join(" + "):"Definir combinação…");});
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
    const getInspectorComponentId = () => {
      const selected = [...(sheet._selectedIds ?? [])];
      if (selected.length === 1) return selected[0];
      if (selected.length > 1) return null;
      return sheet._componentEditorTargetId ?? null;
    };
    const getInspectorComponent = element => {
      if (!element?.closest?.(".nexus-component-inspector")) return null;
      const id = getInspectorComponentId();
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
      const id = getInspectorComponent(event.currentTarget)?.id;
      if (id) await sheet._syncActorPortraitFromToken(id);
    });
    activateActorPropertyPickerListeners(sheet, inspectorNamespace, { collectPropertyPaths, getNativePropertyDefinitions, getAliasDefinitions, safeAliasKey, getNexusRollAliasEntries, buildPropertyPickerCatalog, renderPropertyPicker });
    $(document).on(`input${inspectorNamespace}`, ".nexus-component-inspector [data-component-setting]", event => {
      const input = event.currentTarget;
      const panelWindow = input.closest(".nexus-panel-window");
      if (panelWindow && panelWindow.id !== `nexus-${sheet.id}-component`) return;
      const id = getInspectorComponent(input)?.id;
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
      const input=event.currentTarget, key=input.dataset.componentSetting, id=getInspectorComponent(input)?.id;
      const shouldRestoreInputFocus = document.activeElement === input;
      if(!id) return;
      const drawer = sheet.element?.querySelector(".nexus-appearance-drawer");
      const drawerScroll = { top: drawer?.scrollTop ?? 0, left: drawer?.scrollLeft ?? 0 };
      const restoreEditorViewport = ({ focus = false, target: focusTarget = null } = {}) => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const currentRoot = sheet.element ?? html[0];
          const currentDrawer = currentRoot?.querySelector?.(".nexus-appearance-drawer");
          if (currentDrawer) {
            currentDrawer.scrollTop = drawerScroll.top;
            currentDrawer.scrollLeft = drawerScroll.left;
          }
          if (focus && sheet._componentEditorTargetId === id) {
            const currentInput = focusTarget?.isConnected ? focusTarget
              : currentRoot?.querySelector?.(`[data-component-setting="${CSS.escape(key)}"][data-component-target-id="${CSS.escape(id)}"]`)
                ?? currentRoot?.querySelector?.(`[data-component-setting="${CSS.escape(key)}"]`);
            currentInput?.focus({ preventScroll: true });
          }
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
        const wrappedUrl=source.match(/^\{\{\s*(https?:\/\/[^{}]+?)\s*\}\}$/i);
        const directSource=wrappedUrl?.[1] ?? source;
        const directMedia=isImageSource(directSource) || isVideoSource(directSource);
        const reference=expression?.[1] ?? source;
        const resolved=source && !directMedia ? resolveNexusBinding(sheet.actor,reference) : null;
        const resolvedValue=String(resolved?.value ?? "").trim();
        const validBinding=!!(resolved?.path || resolved?.alias) && (!resolvedValue || isImageSource(resolvedValue) || isVideoSource(resolvedValue));
        if (source && !directMedia && !validBinding) { ui.notifications?.warn?.("Não foi possível reconhecer a imagem. Informe uma imagem ou uma propriedade de imagem válida."); input.value=component.tokenImage??""; return; }
        if (source) component.tokenImage=directMedia ? directSource : `{{${resolved.path || reference}}}`; else delete component.tokenImage;
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
        const rawPath=String(input.value ?? "").trim();
        const wrappedMedia=rawPath.match(/^\{\{\s*(https?:\/\/[^{}]+?)\s*\}\}$/i);
        const directMediaSource=["asset-image","token"].includes(component.type) && isMediaSource(wrappedMedia?.[1] ?? rawPath);
        const path=directMediaSource ? String(wrappedMedia?.[1] ?? rawPath).trim() : normalizeNexusPropertyPath(rawPath);
        const resolved=path && !directMediaSource ? resolveNexusBinding(sheet.actor,path) : null;
        const validPath=!!path && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path);
        // Imagens e tokens aceitam URL/caminho de mídia direto ou uma propriedade do Actor.
        // Um alias personalizado pode não possuir caminho físico em Actor.system.
        if(rawPath && !directMediaSource && (!validPath || (!resolved?.path && !resolved?.alias))) return;
        component.dataPath=path;
        input.value=path;
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
          const editorPanel = sheet.element?.querySelector('[data-tool-panel="component"]') ?? html[0];
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
      const inspector = sheet.element?.querySelector('[data-tool-panel="component"] .nexus-component-inspector');
      if (inspector && kind === "typography") sheet._syncTextToolbar(inspector, component);
    });
    html.find("[data-group-reset]").on("click", async () => {
      const groupId=sheet._selectedGroupId;if(!groupId)return;
      const layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),group=layouts[active]?.groups?.find(item=>item.id===groupId);if(!group)return;
      sheet._captureHistory(); delete group.backgroundColor; delete group.borderColor; delete group.borderRadius;
      await sheet._writeLayouts(layouts,active); sheet.render({force:true});
    });
    const appWindow = html[0].closest(".application, .window-app");
    if (appWindow) { appWindow.classList.add("nexus-window"); applyScopedTheme(appWindow, sheet._currentLayout ?? {}, { base: false, windowTokens: true }); }
    sheet._activateCanvas(html);
    sheet._mountFloatingUI(html);
}
