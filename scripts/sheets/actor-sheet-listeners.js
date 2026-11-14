/**
 * Event bindings for the NEXUS Actor Sheet.
 * Kept separate from the sheet class so the lifecycle facade stays focused.
 */
export function activateActorSheetListeners(sheet, html, dependencies) {
  const { NEXUS_LIBRARY_CATALOG, DEFAULT_LAYOUT, THEME_TOKENS, THEME_PALETTES, applyThemeTokens, NexusPanelWindow, buildPropertyPickerCatalog, renderPropertyPicker, migrateLegacyActorData, mergeLayoutSnapshots, NEXUS_SKILLS, getNexusBaseModifier, getNexusSkillRows, getNexusSkillModifier, executeTriggeredActions, getTriggeredActions, renderInteractionEditor, applyInteractionEditorChange, applyInteractionEditorCommand, getInteractionLibrary, saveInteractionToLibrary, getComponentInteractions, layoutReadSnapshots, layoutWriteQueues, ActorSheetV2, HandlebarsApplicationMixin, NexusActorSheetBase, COMPONENTS, resolveNexusBinding, expandNexusPropertyExpressions, getResourceValuePaths, clone, getPath, collectPropertyPaths, NATIVE_PROPERTY_BASE, nativePropertyDefinitionCache, EMPTY_NATIVE_PROPERTY_LIST, LEGACY_SKILL_PATHS, invalidateNativePropertyCache, getNativePropertyDefinitions, replaceLayoutBindingPaths, EMPTY_ALIAS_LIST, aliasDefinitionCache, invalidateAliasDefinitionCache, getAliasDefinitions, getCustomAliasData, normalizeAliasDefinition, safeAliasKey, evaluateAliasExpression, getNexusRollAliasEntries, expandNexusRollAliases, getNexusRollData, resolveAliasPath, clamp, DEFAULT_FOUNDRY_TOKEN_IMAGE, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, MEDIA_EXTENSION_PATTERN, VIDEO_EXTENSION_PATTERN, isMediaSource, isVideoSource, isAudioSource, isImageSource, isUsableTokenSource, getFoundryDefaultTokenImage, getTokenImageSource, isSafeLink, setPreviewContent, createSheetResourcePreview, fitSheetResourcePreview, updateSheetResourcePreview, NexusActorSheet } = dependencies;

    const currentRoot = html?.[0];
    // Remove detached property-option portals left by a previous ApplicationV2 render.
    document.querySelectorAll(`[data-nexus-property-owner="${sheet.id}"]`).forEach(list => {
      if (!list._nexusOwnerInspector?.isConnected) list.remove();
    });
    const renderDataEditorPreservingState = async (preferredElement = null) => {
      const root = html?.[0];
      const panelEntries = [...(sheet._nexusPanelWindows?.entries?.() ?? [])]
        .map(([key, instance]) => ({ key, root: instance?.element }))
        .filter(entry => entry.root?.isConnected);
      const aliasEntry = panelEntries.find(entry => entry.key === "aliases");
      const panel = aliasEntry?.root?.querySelector?.(".nexus-alias-manager")
        ?? root?.querySelector?.(".nexus-alias-manager");
      const active = preferredElement && panel?.contains(preferredElement) ? preferredElement : document.activeElement;
      const focusDescriptor = panel?.contains(active) ? {
        field: active.dataset?.nativePropertyField ? ["data-native-property-field", active.dataset.nativePropertyField] :
          active.dataset?.aliasField ? ["data-alias-field", active.dataset.aliasField] :
          active.matches?.("[data-native-property-select]") ? ["data-native-property-select", ""] :
          active.matches?.("[data-alias-select]") ? ["data-alias-select", ""] :
          active.matches?.("[data-alias-new-name]") ? ["data-alias-new-name", ""] :
          active.matches?.("[data-alias-mode]") ? ["data-alias-mode", active.dataset.aliasMode] :
          active.matches?.("[data-alias-create]") ? ["data-alias-create", ""] :
          active.matches?.("[data-alias-copy]") ? ["data-alias-copy", ""] :
          active.matches?.("[data-alias-reset]") ? ["data-alias-reset", ""] :
          active.matches?.("[data-alias-delete]") ? ["data-alias-delete", ""] :
          active.matches?.("[data-native-property-reset]") ? ["data-native-property-reset", ""] : null,
        start: typeof active.selectionStart === "number" ? active.selectionStart : null,
        end: typeof active.selectionEnd === "number" ? active.selectionEnd : null
      } : null;
      const scrollSelectors = [
        ".window-content", ".application-content", ".nexus-native-panel-content",
        ".nexus-tool-panel", ".nexus-alias-manager", ".nexus-component-inspector",
        ".nexus-behavior-editor", ".nexus-library-grid", ".nexus-layer-list",
        ".nexus-canvas-scroll", ".nexus-appearance-drawer"
      ];
      const scrollState = [];
      const captureScroll = (ownerKey, ownerRoot) => {
        const seen = new Set();
        for (const selector of scrollSelectors) {
          const node = ownerRoot?.matches?.(selector) ? ownerRoot : ownerRoot?.querySelector?.(selector);
          if (!node || seen.has(node)) continue;
          seen.add(node);
          if (node.scrollTop || node.scrollLeft || node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2) {
            scrollState.push({ ownerKey, selector, top: node.scrollTop, left: node.scrollLeft });
          }
        }
      };
      captureScroll(null, root);
      for (const entry of panelEntries) captureScroll(entry.key, entry.root);
      await sheet.render({ force: true });
      const restore = () => {
        for (const state of scrollState) {
          const ownerRoot = state.ownerKey
            ? sheet._nexusPanelWindows?.get(state.ownerKey)?.element
            : sheet.element?.querySelector?.(".nexus-sheet") ?? sheet.element ?? document;
          const node = ownerRoot?.matches?.(state.selector) ? ownerRoot : ownerRoot?.querySelector?.(state.selector);
          if (node) { node.scrollTop = state.top; node.scrollLeft = state.left; }
        }
        if (!focusDescriptor?.field) return;
        const currentPanel = sheet._nexusPanelWindows?.get("aliases")?.element
          ?? sheet.element?.querySelector?.(".nexus-alias-manager")?.parentElement
          ?? document;
        const activeNow = document.activeElement;
        const [attribute, value] = focusDescriptor.field;
        const escaped = value ? CSS.escape(value) : "";
        const selector = value ? `[${attribute}="${escaped}"]` : `[${attribute}]`;
        const target = currentPanel.querySelector?.(`.nexus-alias-manager ${selector}`);
        if (activeNow && activeNow !== document.body && activeNow !== document.documentElement && activeNow !== target) return;
        if (!target) return;
        target.focus({ preventScroll: true });
        if (focusDescriptor.start !== null && typeof target.setSelectionRange === "function") {
          try { target.setSelectionRange(focusDescriptor.start, focusDescriptor.end); } catch (_) { /* input type does not support selection */ }
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(restore));
    };
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
    html.find("[data-skill-roll]").on("click", event => {
      event.preventDefault(); event.stopPropagation();
      return sheet._rollSkill(event.currentTarget.dataset.skillRoll);
    });
    html.find("[data-skill-proficient-level]").on("change", event => {
      const input = event.currentTarget;
      return sheet._setSkillProficientLevel(input.dataset.skillProficientLevel, input.value);
    });
    html.find("[data-proficiency-level]").on("click", event => {
      event.preventDefault(); event.stopPropagation();
      const button = event.currentTarget, card = button.closest(".nexus-component");
      if (card) sheet._setProficiencyLevel(card.dataset.id, Number(button.dataset.proficiencyLevel));
    });
    const setResourceFromTrack = (track, event) => {
      if (sheet._mode !== "play") return;
      const card = track.closest(".nexus-component");
      const slider = card?.querySelector("[data-resource-slider]");
      if (!slider) return;
      const rect = track.getBoundingClientRect();
      const vertical = track.classList.contains("nexus-sheet-resource-track") && track.closest(".nexus-sheet-resource-preview")?.classList.contains("is-vertical");
      const ratio = vertical ? 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height))) : Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
      const min = Number(slider.min || 0);
      slider.value = String(Math.round(min + ratio * (Number(slider.max) - min)));
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    };
    html.find(".nexus-component[data-action-type='resource-slider'] .nexus-resource-bar, .nexus-component[data-action-type='resource-slider'] .nexus-sheet-resource-track, .nexus-component[data-action-type='resource-slider'] .nexus-asset-meter-track")
      .on("pointerdown", event => { if (event.button !== 0 || sheet._mode !== "play") return; event.preventDefault(); const track = event.currentTarget; track.setPointerCapture?.(event.pointerId); setResourceFromTrack(track, event); })
      .on("pointermove", event => { if (event.buttons === 1) setResourceFromTrack(event.currentTarget, event); })
      .on("pointerup", event => { const track = event.currentTarget; setResourceFromTrack(track, event); track.closest(".nexus-component")?.querySelector("[data-resource-slider]")?.dispatchEvent(new Event("change", { bubbles: true })); });
    html.find("[data-resource-slider]").on("input", event => {
      const input = event.currentTarget, card = input.closest(".nexus-component"); if (!card) return;
      const max = Number(input.max), value = Number(input.value), percent = max > 0 ? clamp(value / max * 100, 0, 100) : 0;
      const vertical = !!card.querySelector(".nexus-sheet-resource-preview.is-vertical");
      card.querySelectorAll(".nexus-resource-bar-fill,.nexus-asset-meter-fill").forEach(fill => {
        fill.style.width = vertical ? "100%" : percent + "%";
        fill.style.height = vertical ? percent + "%" : "100%";
      });
      card.querySelector(".nexus-resource-ring")?.style.setProperty("--nexus-resource-percent", percent + "%");
      const resourceValues = card.querySelector(".nexus-resource-values"), ringValues = card.querySelector(".nexus-resource-ring-values"), barValues = card.querySelector(".nexus-resource-bar-values");
      for (const values of [resourceValues, ringValues]) { const current = values?.querySelector("strong"); if (current) current.textContent = String(value); }
      const barCurrent = barValues?.querySelector("strong"); if (barCurrent) barCurrent.textContent = String(value);
      const component = (sheet._currentLayout?.components ?? []).find(item => item.id === card.dataset.id);
      if (component?.type === "sheet-resource") {
        const preview = card.querySelector(".nexus-sheet-resource-preview");
        updateSheetResourcePreview(preview, { label: component.sheetContent1 ?? "PV", icon: component.sheetContent2 ?? "❤️", current: value, max, color: component.sheetColor ?? "#d94b4b", trackColor: component.sheetTrackColor ?? "#080d14", orientation: component.sheetOrientation ?? "horizontal" });
        const values = card.querySelector(".nexus-sheet-resource-values"); if (values && !values.querySelector("input")) values.textContent = value + " / " + max;
      }
    });
    html.find("[data-resource-slider]").on("change", async event => {
      const input = event.currentTarget;
      if (!input.dataset.systemPath) return;
      await sheet._updateSystemValue(input);
    });
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
    html.find("[data-property-value]").on("change", async event => {
      const input = event.currentTarget;
      const path = String(input.dataset.propertyPath ?? "");
      if (!path || path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) return;
      const kind = input.dataset.propertyKind;
      let value = input.type === "checkbox" ? !!input.checked : input.value;
      const resolvedPath = resolveNexusBinding(sheet.actor, path);
      const targetPath = resolvedPath.virtual ? resolvedPath.sourcePath : resolvedPath.path;
      const expression = typeof value === "string" ? value.trim().match(/^\{\{\s*([^{}]+?)\s*\}\}$/) : null;
      if (expression) {
        const binding = resolveNexusBinding(sheet.actor, expression[1]);
        if (binding.value === undefined || binding.value === null || binding.readOnly) {
          globalThis.ui?.notifications?.warn?.("A referência informada não corresponde a uma propriedade disponível.");
          return;
        }
        value = binding.value;
      }
      if (kind === "number") {
        if (value === "" || typeof value === "boolean" || !Number.isFinite(Number(value))) {
          globalThis.ui?.notifications?.warn?.("Informe um número válido ou uma propriedade numérica.");
          return;
        }
        value = Number(value);
      }
      if (path === "name") await sheet.actor.update({ name: String(value).slice(0, 100) });
      else if (["img", "prototypeToken.texture.src"].includes(targetPath)) {
        const imagePath = String(value).trim().slice(0, 2048);
        if (targetPath === "prototypeToken.texture.src" && !imagePath) {
          await sheet.actor.update({ "prototypeToken.texture.src": DEFAULT_FOUNDRY_TOKEN_IMAGE });
        } else if (!isMediaSource(imagePath)) {
          globalThis.ui?.notifications?.warn?.("Imagem inválida. Informe uma imagem válida ou uma propriedade que contenha uma imagem.");
          input.value = path === "img" || path === "identity.portrait.img" ? (sheet.actor.img ?? "") : getFoundryDefaultTokenImage(sheet.actor);
          return;
        } else {
          await sheet.actor.update(targetPath === "img" ? { img: imagePath } : { [targetPath]: imagePath });
        }
      }
      else if (targetPath === "prototypeToken.ring.colors.ring") {
        const color = String(value).trim();
        if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return;
        await sheet.actor.update({ "prototypeToken.ring.colors.ring": color });
      }
      else await sheet.actor.update(resolvedPath.virtual ? { [targetPath]: value } : { [`system.${targetPath || path}`]: value });
      sheet._refreshBoundComponents();
    });
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
    html.find("[data-config-current-value], [data-config-max-value]").on("change", async event => {
      const input = event.currentTarget, id = [...(sheet._selectedIds ?? [])][0];
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
      await sheet.actor.update({ [`system.${path}`]: value });
      sheet._refreshBoundComponents();
    });
    const persistAliases = async (aliases, focusTarget = null) => {
      const normalized = aliases.map(normalizeAliasDefinition).filter(Boolean);
      await sheet.actor.setFlag("nexus", "aliases", normalized);
      invalidateAliasDefinitionCache(sheet.actor);
      await renderDataEditorPreservingState(focusTarget);
    };
    const slugifyAlias = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "novo";
    const createAlias = async (label, type, valueType, source, targetPath, focusTarget = null) => {
      const aliases = getAliasDefinitions(sheet.actor).map(normalizeAliasDefinition).filter(Boolean);
      const category = type === "attribute" ? "attributes" : type === "resource" ? "resources" : type === "combat" ? "combat" : type === "identity" ? "identity" : "custom";
      const base = slugifyAlias(label);
      let suffix = base, index = 2, key = `${category}.${suffix}`;
      const reservedKeys = getNativePropertyDefinitions(sheet.actor).flatMap(item => [item.key, ...(item.legacyKeys ?? [])]);
      while (aliases.some(item => item.key === key) || reservedKeys.includes(key)) key = `${category}.${base}_${index++}`;
      const id = foundry.utils.randomID();
      const resolvedSource = source === "actor" ? "actor" : "custom";
      const safeTarget = resolvedSource === "actor" ? safeAliasKey(targetPath) : "";
      if (resolvedSource === "actor" && (!safeTarget || resolveNexusBinding(sheet.actor, safeTarget).value === undefined)) {
        ui.notifications?.warn?.("Informe um caminho que já exista em Actor.system.");
        return false;
      }
      const finalType = type === "custom" || type === "identity" ? (type === "identity" ? "text" : valueType || "text") : type === "combat" ? "number" : type;
      aliases.push({ id, key, label: String(label || "Nova propriedade").slice(0,48), category, type: finalType, source: resolvedSource, targetPath: safeTarget });
      if (resolvedSource === "custom") {
        const customData = clone(getCustomAliasData(sheet.actor));
        if (finalType === "attribute") foundry.utils.setProperty(customData, key, { name: String(label), exib: String(label), exibicao: String(label), value: 0, checkbonus: 0, roll: "" });
        else if (finalType === "resource") foundry.utils.setProperty(customData, key, { name: String(label), exib: String(label), exibicao: String(label), value: 0, max: 0 });
        else foundry.utils.setProperty(customData, key, finalType === "number" ? 0 : finalType === "boolean" ? false : "");
        await sheet.actor.setFlag("nexus", "customData", customData);
      }
      await sheet.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(sheet.actor);
      sheet._selectedAliasId = id;
      await renderDataEditorPreservingState(focusTarget);
      return true;
    };
    html.find("[data-alias-create]").on("click", async event => {
      const panel = event.currentTarget.closest(".nexus-alias-manager");
      const label = panel?.querySelector("[data-alias-new-name]")?.value.trim();
      const type = panel?.querySelector("[data-alias-new-type]")?.value || "for";
      const valueType = panel?.querySelector("[data-alias-value-type]")?.value || "text";
      const source = panel?.querySelector("[data-alias-source]")?.value || "custom";
      const targetPath = panel?.querySelector("[data-alias-target]")?.value.trim() || "";
      if (!label) { panel?.querySelector("[data-alias-new-name]")?.focus(); return; }
      if (type === "custom" && source === "actor" && !targetPath) { panel?.querySelector("[data-alias-target]")?.focus(); return; }
      const created = await createAlias(label, type, valueType, source, targetPath, event.currentTarget);
      if (created) { const name = panel?.querySelector("[data-alias-new-name]"); if (name) name.value = ""; }
    });
    html.find("[data-alias-select]").on("change", event => { sheet._selectedAliasId = event.currentTarget.value || null; renderDataEditorPreservingState(event.currentTarget); });
    html.find("[data-alias-mode]").on("click", event => { sheet._aliasEditorMode = event.currentTarget.dataset.aliasMode === "native" ? "native" : "custom"; renderDataEditorPreservingState(event.currentTarget); });
    html.find("[data-native-property-select]").on("change", event => { sheet._selectedNativePropertyId = event.currentTarget.value || null; renderDataEditorPreservingState(event.currentTarget); });
    html.find("[data-native-property-field]").on("change", async event => {
      const input = event.currentTarget, id = input.closest("[data-native-property-row]")?.dataset.nativePropertyRow;
      const definitions = getNativePropertyDefinitions(sheet.actor), property = definitions.find(item => item.id === id); if (!property) return;
      const saved = clone(sheet.actor.getFlag("nexus", "nativeProperties") ?? []);
      let override = saved.find(item => item.id === id);
      if (!override) { override = { id }; saved.push(override); }
      const field = input.dataset.nativePropertyField;
      if (field === "label") override.label = String(input.value).trim().slice(0,48) || property.defaultLabel;
      if (["checkbonus", "roll"].includes(field)) {
        const customData = clone(getCustomAliasData(sheet.actor));
        foundry.utils.setProperty(customData, `${property.key}.${field}`, String(input.value).slice(0,240));
        await sheet.actor.setFlag("nexus", "customData", customData);
      }
      if (["currentValue", "maxValue"].includes(field)) {
        if (property.targetPath === "name") await sheet.actor.update({ name: String(input.value).slice(0,100) });
        else {
          const suffix = property.type === "resource" ? (field === "currentValue" ? "value" : "max") : "value";
          const target = property.type === "resource" ? `${property.targetPath}.${suffix}` : property.targetPath;
          let nextValue;
          if (property.type === "boolean") nextValue = input.value === "true";
          else if (["resource", "attribute", "number"].includes(property.type)) {
            nextValue = Number(input.value);
            if (!Number.isFinite(nextValue)) { ui.notifications?.warn?.("Informe um valor numérico válido."); return; }
          } else nextValue = String(input.value).slice(0, 500);
          await sheet.actor.update({ [`system.${target}`]: nextValue });
        }
      }
      if (field === "keySuffix") {
        const suffix = slugifyAlias(input.value);
        const nextKey = `${property.category}.${suffix}`;
        const collision = [...getAliasDefinitions(sheet.actor), ...definitions.filter(item => item.id !== id)].some(item => [item.key, ...(item.legacyKeys ?? [])].includes(nextKey));
        if (!suffix || collision) { ui.notifications?.warn?.("Esse identificador já está em uso ou é inválido."); input.value = property.key.split(".").at(-1); return; }
        const previousKey = property.key;
        override.key = nextKey;
        override.legacyKeys = [...new Set([...(property.legacyKeys ?? []), previousKey])];
        const customData = clone(getCustomAliasData(sheet.actor));
        const previousMeta = getPath(customData, previousKey);
        if (previousMeta && typeof previousMeta === "object") {
          foundry.utils.setProperty(customData, nextKey, previousMeta);
          const parts = previousKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join(".")); if (parent) delete parent[leaf];
          await sheet.actor.setFlag("nexus", "customData", customData);
        }
        const layouts = await sheet._readLayouts();
        replaceLayoutBindingPaths(layouts, previousKey, nextKey);
        replaceLayoutBindingPaths(layouts, previousKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), nextKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
      }
      await sheet.actor.setFlag("nexus", "nativeProperties", saved);
      invalidateNativePropertyCache(sheet.actor);
      sheet._selectedNativePropertyId = id; renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-native-property-reset]").on("click", async event => {
      const id = event.currentTarget.closest("[data-native-property-row]")?.dataset.nativePropertyRow;
      const property = getNativePropertyDefinitions(sheet.actor).find(item => item.id === id); if (!property) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({ window:{title:"Restaurar dado nativo"}, content:`<p>Restaurar <strong>${Handlebars.escapeExpression(property.defaultLabel)}</strong> ao identificador original?</p>`, yes:{label:"Restaurar"}, no:{label:"Cancelar"}, rejectClose:false });
      if (!confirmed) return;
      const saved = clone(sheet.actor.getFlag("nexus", "nativeProperties") ?? []);
      const override = saved.find(item => item.id === id);
      const oldKey = property.key;
      if (override) {
        override.legacyKeys = [...new Set([...(override.legacyKeys ?? []), oldKey])];
        override.key = property.defaultKey; override.label = property.defaultLabel;
      }
      const customData = clone(getCustomAliasData(sheet.actor));
      const previousMeta = getPath(customData, oldKey);
      if (previousMeta && typeof previousMeta === "object" && oldKey !== property.defaultKey) {
        foundry.utils.setProperty(customData, property.defaultKey, previousMeta);
        const parts = oldKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join(".")); if (parent) delete parent[leaf];
      }
      const defaultMeta = getPath(customData, property.defaultKey);
      if (defaultMeta && typeof defaultMeta === "object") { delete defaultMeta.checkbonus; delete defaultMeta.roll; }
      await sheet.actor.setFlag("nexus", "customData", customData);
      if (oldKey !== property.defaultKey) {
        const layouts = await sheet._readLayouts();
        replaceLayoutBindingPaths(layouts, oldKey, property.defaultKey);
        replaceLayoutBindingPaths(layouts, oldKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), property.defaultKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
      }
      await sheet.actor.setFlag("nexus", "nativeProperties", saved);
      invalidateNativePropertyCache(sheet.actor);
      renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-new-type], [data-alias-source]").on("change", event => {
      const panel = event.currentTarget.closest(".nexus-alias-manager"); if (!panel) return;
      const custom = panel.querySelector("[data-alias-new-type]")?.value === "custom";
      const valueRow = panel.querySelector("[data-alias-value-type-row]"); if (valueRow) valueRow.hidden = !custom;
      const sourceRow = panel.querySelector("[data-alias-source-row]"); if (sourceRow) sourceRow.hidden = !custom;
      const targetRow = panel.querySelector("[data-alias-target-row]"); if (targetRow) targetRow.hidden = !custom || panel.querySelector("[data-alias-source]")?.value !== "actor";
    });
    html.find("[data-alias-field]").on("change", async event => {
      const input = event.currentTarget, row = input.closest("[data-alias-row]"), id = row?.dataset.aliasRow;
      const aliases = getAliasDefinitions(sheet.actor).map(normalizeAliasDefinition).filter(Boolean);
      const alias = aliases.find(item => item.id === id); if (!alias) return;
      const field = input.dataset.aliasField;
      if (field === "name") {
        alias.label = String(input.value).slice(0,48);
        if (["attribute", "resource"].includes(alias.type) && alias.source !== "actor") {
          const customData = clone(getCustomAliasData(sheet.actor));
          foundry.utils.setProperty(customData, `${alias.key}.name`, alias.label);
          await sheet.actor.setFlag("nexus", "customData", customData);
        }
      }
      else if (field === "targetPath") {
        const nextPath = safeAliasKey(input.value);
        if (input.value.trim() && (!nextPath || resolveNexusBinding(sheet.actor, nextPath).value === undefined)) {
          ui.notifications?.warn?.("O caminho precisa existir em Actor.system."); input.value = alias.targetPath; return;
        }
        alias.targetPath = nextPath;
        alias.source = alias.targetPath ? "actor" : "custom";
      }
      else if (field === "source") {
        if (input.value === "actor" && !alias.targetPath) { input.value = "custom"; return; }
        alias.source = input.value === "actor" ? "actor" : "custom";
        if (alias.source === "custom") alias.targetPath = "";
      }
      else if (field === "valueType") {
        if (["number", "text", "url", "image", "boolean"].includes(input.value)) alias.type = input.value;
      }
      else if (field === "keySuffix") {
        const suffix = slugifyAlias(input.value);
        const next = `${alias.category}.${suffix}`;
        const reserved = getNativePropertyDefinitions(sheet.actor).flatMap(item => [item.key, ...(item.legacyKeys ?? [])]);
        if (aliases.some(item => item !== alias && [item.key, ...(item.legacyKeys ?? [])].includes(next)) || reserved.includes(next)) { input.value = alias.key.split(".").at(-1); return; }
        const previousKey = alias.key;
        alias.legacyKeys ??= []; if (!alias.legacyKeys.includes(previousKey)) alias.legacyKeys.push(previousKey);
        const customData = clone(getCustomAliasData(sheet.actor));
        if (!alias.targetPath) {
          const previous = getPath(customData, previousKey);
          if (previous !== undefined) {
            foundry.utils.setProperty(customData, next, previous);
            const parts = previousKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join("."));
            if (parent) delete parent[leaf];
            await sheet.actor.setFlag("nexus", "customData", customData);
          }
        }
        // Migra referências de componentes para que a troca do identificador
        // não deixe cartões apontando para o caminho antigo.
        const layouts = await sheet._readLayouts();
        replaceLayoutBindingPaths(layouts, previousKey, next);
        replaceLayoutBindingPaths(layouts, previousKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), next.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
        alias.key = next;
      }
      else if (["exibicao", "value", "max", "checkbonus", "roll"].includes(field)) {
        const isText = ["exibicao", "roll", "checkbonus"].includes(field) || (field === "value" && ["text", "url", "image"].includes(alias.type));
        const value = field === "value" && alias.type === "boolean" ? input.checked : isText ? String(input.value).slice(0, field === "roll" ? 120 : 2048) : Number(input.value);
        const path = `${alias.key}.${field}`;
        const writeToTarget = alias.source === "actor" && alias.targetPath && (field === "value" || (alias.type === "resource" && field === "max"));
        if (writeToTarget) {
          const target = alias.type === "resource" ? `${alias.targetPath}.${field}` : alias.targetPath;
          const resolvedTarget = resolveNexusBinding(sheet.actor, target);
          const updatePath = resolvedTarget.virtual ? resolvedTarget.sourcePath : `system.${target}`;
          await sheet.actor.update({ [updatePath]: value });
        }
        else { const customData = clone(getCustomAliasData(sheet.actor)); if (["number", "text", "url", "image", "boolean"].includes(alias.type) && field === "value") foundry.utils.setProperty(customData, alias.key, value); else foundry.utils.setProperty(customData, path, value); await sheet.actor.setFlag("nexus", "customData", customData); }
      }
      await sheet.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(sheet.actor);
      renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-copy]").on("click", async event => {
      const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
      const aliases = getAliasDefinitions(sheet.actor).map(normalizeAliasDefinition).filter(Boolean);
      const source = aliases.find(item => item.id === id); if (!source) return;
      const base = `${source.key.split(".").at(-1)}_copy`;
      let suffix = base, index = 2, key = `${source.category}.${suffix}`;
      const reserved = getNativePropertyDefinitions(sheet.actor).flatMap(item => [item.key, ...(item.legacyKeys ?? [])]);
      while (aliases.some(item => item.key === key) || reserved.includes(key)) key = `${source.category}.${base}_${index++}`;
      const copy = { ...clone(source), id: foundry.utils.randomID(), key, label: `${source.label} (cópia)`.slice(0,48), source: "custom", targetPath: "" };
      aliases.push(copy);
      const customData = clone(getCustomAliasData(sheet.actor));
      const original = getPath(customData, source.key);
      if (original !== undefined) foundry.utils.setProperty(customData, key, clone(original));
      else if (source.type === "attribute") foundry.utils.setProperty(customData, key, { name: copy.label, exib: copy.label, exibicao: copy.label, value: 0, checkbonus: 0, roll: "" });
      else if (source.type === "resource") foundry.utils.setProperty(customData, key, { name: copy.label, exib: copy.label, exibicao: copy.label, value: 0, max: 0 });
      else foundry.utils.setProperty(customData, key, source.type === "number" ? 0 : source.type === "boolean" ? false : "");
      await sheet.actor.setFlag("nexus", "customData", customData);
      await sheet.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(sheet.actor); sheet._selectedAliasId = copy.id; renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-reset]").on("click", async event => {
      const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
      const aliases = getAliasDefinitions(sheet.actor).map(normalizeAliasDefinition).filter(Boolean);
      const alias = aliases.find(item => item.id === id); if (!alias) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Restaurar propriedade" },
        content: `<p>Restaurar os valores padrão de <strong>${Handlebars.escapeExpression(alias.label)}</strong>? Os valores personalizados serão redefinidos.</p>`,
        yes: { label: "Restaurar" }, no: { label: "Cancelar" }, rejectClose: false
      });
      if (!confirmed) return;
      const customData = clone(getCustomAliasData(sheet.actor));
      const defaultSuffix = slugifyAlias(alias.label);
      let defaultKey = `${alias.category}.${defaultSuffix}`, collision = 2;
      while (aliases.some(item => item !== alias && item.key === defaultKey)) defaultKey = `${alias.category}.${defaultSuffix}_${collision++}`;
      if (defaultKey !== alias.key) {
        const previousKey = alias.key;
        alias.legacyKeys ??= []; if (!alias.legacyKeys.includes(previousKey)) alias.legacyKeys.push(previousKey);
        if (!alias.targetPath) {
          const previous = getPath(customData, previousKey);
          if (previous !== undefined) {
            foundry.utils.setProperty(customData, defaultKey, previous);
            const parts = previousKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join("."));
            if (parent) delete parent[leaf];
          }
        }
        const layouts = await sheet._readLayouts();
        replaceLayoutBindingPaths(layouts, previousKey, defaultKey);
        replaceLayoutBindingPaths(layouts, previousKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), defaultKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
        alias.key = defaultKey;
      }
      if (!alias.targetPath) {
        let defaults;
        if (alias.type === "attribute") defaults = { name: alias.label, exib: alias.exib ?? alias.label, exibicao: alias.exib ?? alias.label, value: 0, checkbonus: 0, roll: "" };
        else if (alias.type === "resource") defaults = { name: alias.label, exib: alias.exib ?? alias.label, exibicao: alias.exib ?? alias.label, value: 0, max: 0 };
        else defaults = alias.type === "number" ? 0 : alias.type === "boolean" ? false : "";
        foundry.utils.setProperty(customData, alias.key, defaults);
        await sheet.actor.setFlag("nexus", "customData", customData);
      }
      await sheet.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(sheet.actor); renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-delete]").on("click", async event => {
      const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
      await persistAliases(getAliasDefinitions(sheet.actor).filter(item => item.id !== id), event.currentTarget);
    });
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
    sheet._libraryRenderSavedGroups=renderSavedGroups;
    sheet._libraryRenderPersonalItems=()=>{renderSavedComponents();renderSavedGroups();};
    sheet._libraryRenderPersonalItems();
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
      const themeCards=[...(libraryPanel?.querySelectorAll("[data-library-theme]")??[])];let visibleThemes=0;
      themeCards.forEach(card=>{card.hidden=!!query&&!card.dataset.libraryAsset.includes(query);if(!card.hidden)visibleThemes++;});
      const flowCards=[...(libraryPanel?.querySelectorAll("[data-library-flow-id]")??[])];let visibleFlows=0;
      flowCards.forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase("pt-BR").includes(query);if(!card.hidden)visibleFlows++;});
      const personal=libraryPanel?.querySelector("[data-library-personal]");if(personal)personal.hidden=scope!=="personal";
      const assets=libraryPanel?.querySelector("[data-library-assets]");if(assets)assets.hidden=scope!=="core";
      const personalCount=(game.user?.getFlag?.("nexus","libraryComponents")??[]).length+(game.user?.getFlag?.("nexus","libraryGroups")??[]).length;
      libraryPanel?.querySelectorAll("[data-library-saved-component],[data-library-saved-group]").forEach(card=>{card.hidden=!!query&&!card.textContent.toLocaleLowerCase("pt-BR").includes(query);});
      const count=libraryPanel?.querySelector("[data-library-count]");
      if(count)count.textContent=activeSection==="themes"?`${visibleThemes} ${visibleThemes===1?"tema":"temas"}`:activeSection==="flows"?`${visibleFlows} ${visibleFlows===1?"fluxo":"fluxos"}`:scope==="personal"?`${personalCount} ${personalCount===1?"item":"itens"}`:`${visible} ${visible===1?"asset":"assets"}`;
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
      const themeCard = target?.closest("[data-library-theme]");
      if (themeCard && libraryPanel.contains(themeCard)) {
        event.preventDefault();
        await sheet._applyThemePreset(themeCard.dataset.libraryTheme);
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
        const remove=document.createElement("button");remove.type="button";remove.dataset.libraryDeleteSavedComponent="";remove.textContent="Excluir da biblioteca";
        detail.append(heading,summary,add,remove);return;
      }
      const savedFlowCard=target?.closest("[data-library-flow-id]");
      if(savedFlowCard&&libraryPanel.contains(savedFlowCard)){
        event.preventDefault();
        const entry=getInteractionLibrary(sheet.actor).find(item=>item.id===savedFlowCard.dataset.libraryFlowId);
        const detail=libraryPanel.querySelector("[data-library-details]");if(!entry||!detail)return;
        libraryPanel.querySelectorAll("[data-library-flow-id]").forEach(item=>item.classList.toggle("is-selected",item===savedFlowCard));
        detail.dataset.selectedType="saved-flow";detail.dataset.selectedFlowId=entry.id;detail.replaceChildren();
        const heading=document.createElement("div");heading.className="nexus-library-detail-heading";
        const title=document.createElement("strong");title.className="nexus-library-detail-title";title.textContent=entry.name||"Fluxo salvo";heading.append(title);
        const summary=document.createElement("p");summary.textContent=`${entry.flow?.triggers?.length??0} gatilhos · ${entry.flow?.conditions?.length??0} condições · ${entry.flow?.actions?.length??0} ações`;
        const add=document.createElement("button");add.type="button";add.dataset.libraryAddFlow="";add.textContent="Adicionar ao componente selecionado";
        detail.append(heading,summary,add);return;
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
        summary.textContent = `Composição com ${saved.components?.length ?? 0} elementos independentes.`;
        const add = document.createElement("button");
        add.type = "button";
        add.dataset.libraryAddGroup = "";
        add.textContent = "Adicionar grupo ao Canvas";
        detail.append(heading, summary, add);
        return;
      }

      const assetCard = target?.closest("[data-library-asset]");
      if (assetCard && libraryPanel.contains(assetCard)) {
        event.preventDefault();
        if (!assetCard.dataset.libraryTheme) selectLibraryAsset(assetCard);
        return;
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
      const addFlowButton=target?.closest("[data-library-add-flow]");
      if(addFlowButton&&libraryPanel.contains(addFlowButton)){
        const id=libraryPanel.querySelector("[data-library-details]")?.dataset.selectedFlowId;
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
    html.find("[data-layer-group]").on("click", event => {
      if(event.target.closest("[data-layer-disclosure]")){
        event.preventDefault();event.stopPropagation();const id=event.currentTarget.dataset.layerGroup;sheet._collapsedLayerGroups??=new Set();
        if(sheet._collapsedLayerGroups.has(id))sheet._collapsedLayerGroups.delete(id);else sheet._collapsedLayerGroups.add(id);
        const folder=event.currentTarget.closest(".nexus-layer-folder"),children=folder?.querySelector(".nexus-layer-children"),icon=event.currentTarget.querySelector("[data-layer-disclosure]");
        if(children)children.hidden=sheet._collapsedLayerGroups.has(id);if(icon)icon.textContent=children?.hidden?"▸":"▾";return;
      }
      sheet._nexusInteractionActive = false; const group=(sheet._currentLayout?.groups??[]).find(g=>g.id===event.currentTarget.dataset.layerGroup); sheet._setSelection(html,group?.componentIds??[]); sheet._selectedGroupId=group?.id??null;
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
      if(groupId){const group=(sheet._currentLayout?.groups??[]).find(item=>item.id===groupId);sheet._setSelection(html,group?.componentIds??[]);sheet._selectedGroupId=groupId;}
      else sheet._setSelection(html,[row.dataset.layerSelect]);
      const portal=document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);portal?.querySelector('[data-floating-panel="component"]')?.click();
    });
    html.find("[data-layer-select], [data-layer-group]").attr("draggable", "true").on("dragstart", event => {
      const row=event.currentTarget, id=row.dataset.layerSelect || row.dataset.layerGroup;
      event.originalEvent.dataTransfer.setData("text/nexus-layer", id); event.originalEvent.dataTransfer.effectAllowed="move";
      row.classList.add("is-dragging");
    }).on("dragend", event => event.currentTarget.classList.remove("is-dragging"))
      .on("dragover", event => {
        event.preventDefault(); event.originalEvent.dataTransfer.dropEffect="move";
        const row=event.currentTarget, rect=row.getBoundingClientRect(), ratio=(event.originalEvent.clientY-rect.top)/Math.max(1,rect.height);
        const list=row.closest(".nexus-layer-list");
        if(list){const edge=34, y=event.originalEvent.clientY, box=list.getBoundingClientRect();if(y<box.top+edge)list.scrollTop-=Math.ceil((box.top+edge-y)/4);else if(y>box.bottom-edge)list.scrollTop+=Math.ceil((y-(box.bottom-edge))/4);}
        row.classList.remove("drop-before","drop-after","drop-inside");
        row.classList.add(row.dataset.layerGroup && ratio>.25 && ratio<.75 ? "drop-inside" : ratio<.5 ? "drop-before" : "drop-after");
      }).on("dragleave", event => event.currentTarget.classList.remove("drop-before","drop-after","drop-inside"))
      .on("drop", async event => {
        event.preventDefault(); const source=event.originalEvent.dataTransfer.getData("text/nexus-layer"), row=event.currentTarget, target=row.dataset.layerSelect || row.dataset.layerGroup;
        const rect=row.getBoundingClientRect(), ratio=(event.originalEvent.clientY-rect.top)/Math.max(1,rect.height);
        const placement=row.dataset.layerGroup && ratio>.25 && ratio<.75 ? "inside" : ratio<.5 ? "before" : "after";
        row.classList.remove("drop-before","drop-after","drop-inside");
        if(!source || source===target) return; await sheet._reorderLayer(source,target,placement);
      });
    const inspectorNamespace = `.nexusInspector${String(sheet.id).replace(/[^a-zA-Z0-9]/g, "")}`;
    sheet._nexusInspectorNamespace = inspectorNamespace;
    $(document).off(inspectorNamespace);
    const persistInteractionEditor = async (control, command = null) => {
      const componentId = control.dataset.componentId || control.closest("[data-interaction-editor]")?.dataset.componentId;
      const interactionId = control.dataset.interactionId || "";
      if (!componentId) return;
      const layouts = await sheet._readLayouts(), active = sheet._activeLayoutId(), component = layouts[active]?.components?.find(item => item.id === componentId);
      if (!component) return;
      sheet._captureHistory();
      const data = { interactionId, triggerIndex: control.dataset.triggerIndex, conditionIndex: control.dataset.conditionIndex, actionIndex: control.dataset.actionIndex, direction: control.dataset.direction };
      if (command === "save-flow") {
        const flow = getComponentInteractions(component).find(item => item.id === interactionId);
        if (!flow) return;
        await saveInteractionToLibrary(sheet.actor, flow);
        ui.notifications?.info?.("Fluxo salvo na Biblioteca.");
      } else if (command === "add-library-flow") {
        const template = getInteractionLibrary(sheet.actor).find(item => item.id === control.dataset.templateId);
        if (!template) { ui.notifications?.warn?.("Selecione um fluxo salvo na Biblioteca."); return; }
        applyInteractionEditorCommand(component, command, { ...data, template: template.flow });
      } else if (command) applyInteractionEditorCommand(component, command, data);
      else applyInteractionEditorChange(component, { ...data, scope: control.dataset.interactionScope, field: control.dataset.interactionField }, control.type === "checkbox" ? control.checked : control.value);
      if (command !== "save-flow") await sheet._writeLayouts(layouts, active);
      const editor = control.closest("[data-interaction-editor]") || sheet._nexusPanelWindows?.get("behavior")?.panel?.querySelector("[data-interaction-editor]");
      if (editor) {
        if (command === "add-flow") editor.dataset.activeInteractionId = component.interactions?.at(-1)?.id ?? "";
        const scrollContainer = editor.closest(".nexus-behavior-editor");
        const scrollTop = scrollContainer?.scrollTop ?? editor.scrollTop;
        const focusData = { scope: control.dataset.interactionScope, field: control.dataset.interactionField, interactionId, triggerIndex: control.dataset.triggerIndex, conditionIndex: control.dataset.conditionIndex, actionIndex: control.dataset.actionIndex, selectionStart: typeof control.selectionStart === "number" ? control.selectionStart : null, selectionEnd: typeof control.selectionEnd === "number" ? control.selectionEnd : null, selectionDirection: control.selectionDirection ?? "none" };
        renderInteractionEditor(editor, component, layouts[active]?.components ?? [], getInteractionLibrary(sheet.actor), sheet.actor);
        editor.dataset.componentId = componentId;
        if (scrollContainer) scrollContainer.scrollTop = scrollTop;
        else editor.scrollTop = scrollTop;
        const nextControl = [...editor.querySelectorAll("[data-interaction-field]")].find(item =>
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
    $(document).on(`click${inspectorNamespace}`, ".nexus-behavior-editor [data-interaction-action]", async event => {
      event.preventDefault(); event.stopPropagation();
      const button=event.currentTarget;
      if(button.dataset.interactionAction==="add-library-flow"){
        const select=button.parentElement?.querySelector("[data-interaction-library-select]");
        button.dataset.templateId=select?.value??"";
      }
      await persistInteractionEditor(button, button.dataset.interactionAction);
    });
    $(document).on(`change${inspectorNamespace}`, ".nexus-behavior-editor [data-interaction-field]", async event => {
      event.stopPropagation(); await persistInteractionEditor(event.currentTarget);
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

    const propertyPickerId=`nexus-property-picker-${String(sheet.id).replace(/[^a-zA-Z0-9_-]/g,"")}`;
    const getPropertyOptionsOwner=input=>input?.closest(".nexus-panel-window, .nexus-library-panel, .nexus-component-inspector, .nexus-behavior-editor");
    const ensurePropertyOptionsList=()=>{
      let list=document.getElementById(propertyPickerId);
      if(!list){
        list=document.createElement("div");list.className="nexus-property-options";list.id=propertyPickerId;list.dataset.componentPathOptions="";list.dataset.nexusPropertyOwner=String(sheet.id);list.hidden=true;
        list.setAttribute("role","listbox");list.setAttribute("aria-label","Propriedades disponíveis");document.body.append(list);
      }
      return list;
    };
    const positionPropertyOptions=input=>{
      if(!input?.isConnected)return;
      const list=ensurePropertyOptionsList(),owner=getPropertyOptionsOwner(input);if(!owner||list.hidden)return;
      list._nexusOwnerInspector=owner;list._nexusOwnerInput=input;
      const rect=input.getBoundingClientRect(),vw=document.documentElement.clientWidth||window.innerWidth,vh=document.documentElement.clientHeight||window.innerHeight,gap=6;
      const width=Math.min(Math.max(280,rect.width),Math.min(520,vw-24));
      const above=Math.max(0,rect.top-gap-12),below=Math.max(0,vh-rect.bottom-gap-12),placeAbove=above>below&&above>140;
      const maxHeight=Math.max(112,Math.min(340,placeAbove?above:below));
      list.style.position="fixed";list.style.left=`${Math.max(12,Math.min(rect.left,vw-width-12))}px`;list.style.width=`${width}px`;
      list.style.maxHeight=`${maxHeight}px`;list.style.top=placeAbove?`${Math.max(8,rect.top-Math.min(list.scrollHeight||240,maxHeight)-gap)}px`:`${Math.min(vh-maxHeight-8,rect.bottom+gap)}px`;
      list.style.bottom="auto";list.style.overflowY="auto";
    };
    const filterPropertyOptions=input=>{
      const list=ensurePropertyOptionsList(),owner=getPropertyOptionsOwner(input);if(!owner)return;
      if(list._nexusOwnerInput!==input)list.dataset.categoryPath="";
      list._nexusOwnerInput=input;list._nexusOwnerInspector=owner;
      const paths=new Set(["name",...collectPropertyPaths(sheet.actor)]);
      for(const alias of [...getNativePropertyDefinitions(sheet.actor),...getAliasDefinitions(sheet.actor)]){
        const root=safeAliasKey(alias.key);if(!root)continue;
        const suffixes=alias.type==="attribute"?["checkbonus","roll"]:alias.type==="resource"?["value","max","percentage"]:[ "" ];
        for(const suffix of suffixes)paths.add(suffix?`${root}.${suffix}`:root);
      }
      const nativeProperties=getNativePropertyDefinitions(sheet.actor),aliases=getAliasDefinitions(sheet.actor),rollAliases=getNexusRollAliasEntries(sheet.actor);
      const signature=JSON.stringify({paths:[...paths].sort(),native:nativeProperties.map(item=>[item.id,item.key,item.label]),aliases:aliases.map(item=>[item.key,item.label,item.targetPath]),rollAliases:rollAliases.map(entry=>[entry.target,entry.display,entry.label])});
      if(list.dataset.optionsSignature!==signature){
        list._nexusCatalog=buildPropertyPickerCatalog({paths:[...paths],nativeProperties,aliases,rollAliases});
        list.dataset.optionsSignature=signature;
      }
      const formulaMode=input.hasAttribute("data-roll-formula-input");
      const propertyMode=input.hasAttribute("data-component-path-input")||input.hasAttribute("data-interaction-property-input");
      const raw=String(input.value??""),cursor=input.selectionStart??raw.length,before=raw.slice(0,cursor);
      const formulaAt=formulaMode?before.match(/@([A-Za-z0-9_.-]*)$/):null;
      const formulaExpression=formulaMode?before.match(/\{\{\s*([A-Za-z0-9_.-]*)$/):null;
      const templateExpression=!formulaMode&&!propertyMode?before.match(/\{\{\s*([A-Za-z0-9_.-]*)$/):null;
      if((formulaMode&&!formulaAt&&!formulaExpression)||(!formulaMode&&!propertyMode&&!templateExpression)){list.hidden=true;return;}
      const query=(formulaAt?.[1]??formulaExpression?.[1]??templateExpression?.[1]??(propertyMode?raw:"")).trim();
      list._nexusQuery=query;list._nexusFormulaMode=formulaMode;
      renderPropertyPicker(list,list._nexusCatalog,{categoryPath:list.dataset.categoryPath??"",query,formulaMode});
      list.hidden=false;requestAnimationFrame(()=>positionPropertyOptions(input));
    };
    const propertyInputSelector=".nexus-panel-window [data-component-path-input], .nexus-panel-window [data-interaction-property-input], .nexus-panel-window [data-roll-formula-input], .nexus-library-panel [data-component-path-input], .nexus-library-panel [data-interaction-property-input], .nexus-library-panel [data-roll-formula-input]";
    const templateInputSelector=".nexus-panel-window input[type='text']:not([data-component-path-input]):not([data-interaction-property-input]):not([data-roll-formula-input]), .nexus-panel-window input[type='search']:not([data-library-search]), .nexus-panel-window textarea, .nexus-library-panel input[type='text']:not([data-component-path-input]):not([data-interaction-property-input]):not([data-roll-formula-input]), .nexus-library-panel textarea";
    $(document).on(`focusin${inspectorNamespace}`,propertyInputSelector+", "+templateInputSelector,event=>filterPropertyOptions(event.currentTarget));
    $(document).on(`input${inspectorNamespace}`,propertyInputSelector+", "+templateInputSelector,event=>filterPropertyOptions(event.currentTarget));
    $(window).on(`resize${inspectorNamespace} scroll${inspectorNamespace}`,()=>{const input=document.activeElement?.matches?.(propertyInputSelector+", "+templateInputSelector)?document.activeElement:null;if(input)positionPropertyOptions(input);});
    $(document).on(`pointerdown${inspectorNamespace}`,"[data-property-category], [data-property-back], [data-property-path-option]",event=>{
      // Keep focus on the source field; focusout would otherwise close the portal
      // before the category can be opened or an option can be selected.
      event.preventDefault();
      event.stopPropagation();
    });
    $(document).on(`click${inspectorNamespace}`,"[data-property-category]",event=>{
      event.preventDefault();event.stopPropagation();
      const list=event.currentTarget.closest("[data-component-path-options]"),input=list?._nexusOwnerInput;
      if(!list||!list._nexusCatalog)return;
      list.dataset.categoryPath=event.currentTarget.dataset.propertyCategory??"";
      renderPropertyPicker(list,list._nexusCatalog,{categoryPath:list.dataset.categoryPath,query:"",formulaMode:!!list._nexusFormulaMode});
      if(input?.isConnected)positionPropertyOptions(input);
    });
    $(document).on(`click${inspectorNamespace}`,"[data-property-back]",event=>{
      event.preventDefault();event.stopPropagation();
      const list=event.currentTarget.closest("[data-component-path-options]"),input=list?._nexusOwnerInput;
      if(!list||!list._nexusCatalog)return;
      list.dataset.categoryPath=String(list.dataset.categoryPath??"").split(".").slice(0,-1).join(".");
      renderPropertyPicker(list,list._nexusCatalog,{categoryPath:list.dataset.categoryPath,query:"",formulaMode:!!list._nexusFormulaMode});
      if(input?.isConnected)positionPropertyOptions(input);
    });
    $(document).on(`click${inspectorNamespace}`,"[data-property-path-option]",event=>{
      event.preventDefault();event.stopPropagation();
      const button=event.currentTarget,list=button.closest("[data-component-path-options]"),input=list?._nexusOwnerInput;
      if(!input||!list)return;
      const value=input.value,cursor=input.selectionStart??value.length,before=value.slice(0,cursor);
      const formulaMode=input.hasAttribute("data-roll-formula-input");
      const propertyMode=input.hasAttribute("data-component-path-input")||input.hasAttribute("data-interaction-property-input");
      const atMatch=formulaMode?before.match(/@([A-Za-z0-9_.-]*)$/):null;
      const braceMatch=before.match(/\{\{\s*([A-Za-z0-9_.-]*)$/);
      let start=cursor,end=cursor,token=button.dataset.propertyPathOption;
      if(propertyMode){start=0;end=value.length;}
      else if(formulaMode&&atMatch){start=cursor-atMatch[0].length;while(end<value.length&&/[A-Za-z0-9_.-]/.test(value[end]))end++;token=button.dataset.rollToken||"@"+token;}
      else if(braceMatch){start=cursor-braceMatch[0].length;while(end<value.length&&/[A-Za-z0-9_.-]/.test(value[end]))end++;if(value.slice(end,end+2)==="}}")end+=2;token="{{"+token+"}}";}
      else if(formulaMode)return;
      input.value=value.slice(0,start)+token+value.slice(end);
      input.focus({preventScroll:true});
      if(typeof input.setSelectionRange==="function")input.setSelectionRange(start+token.length,start+token.length);
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
      list.hidden=true;list.dataset.categoryPath="";
    });
    $(document).on(`pointerdown${inspectorNamespace}`,"[data-component-path-options]",event=>event.stopPropagation());
    $(document).on(`scroll${inspectorNamespace}`,".nexus-panel-window, .nexus-component-inspector",()=>{const list=document.getElementById(propertyPickerId),input=list?._nexusOwnerInput;if(input?.isConnected)positionPropertyOptions(input);});
    $(document).on(`focusout${inspectorNamespace}`,propertyInputSelector+", "+templateInputSelector,event=>{
      const input=event.currentTarget,list=document.getElementById(propertyPickerId);
      setTimeout(()=>{if(list&&!list.contains(document.activeElement)&&document.activeElement!==input){list.hidden=true;list.dataset.categoryPath="";list.style.top="";list.style.left="";list.style.width="";list._nexusOwnerInput=null;list._nexusOwnerInspector=null;}},140);
    });
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
        const resolved = resolveNexusBinding(sheet.actor, input.value);
        const path = resolved.path;
        if (String(input.value).trim() && (!path || !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path))) return;
        component.dataPath = path;
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
    });
    html.find("[data-group-setting]").on("change", async event => {
      const input = event.currentTarget;
      const groupId = sheet._selectedGroupId;
      if (!groupId) return;
      const layouts = await sheet._readLayouts();
      const active = sheet._activeLayoutId();
      const layout = layouts[active];
      const group = layout?.groups?.find(item => item.id === groupId);
      if (!group) return;
      sheet._captureHistory();
      const key = input.dataset.groupSetting;
      if (key === "borderRadius") group.borderRadius = clamp(Number(input.value) || 0, 0, 32);
      else if (key === "backgroundColor" || key === "borderColor") group[key] = input.value;
      await sheet._writeLayouts(layouts, active);
      const groupNode = html[0].querySelector(`.nexus-group-surface[data-group-id="${groupId}"]`);
      const cssKey = key === "backgroundColor" ? "--nexus-group-bg" : key === "borderColor" ? "--nexus-group-border" : "--nexus-group-radius";
      const cssValue = key === "borderRadius" ? `${group.borderRadius}px` : group[key];
      if (groupNode) groupNode.style.setProperty(cssKey, cssValue);
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
