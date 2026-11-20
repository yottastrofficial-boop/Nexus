import { serializeActorPropertyWrite } from "../core/actor-property-writes.js";
import {
  slugifyActorAlias,
  createUniqueActorAliasKey,
  moveActorAliasCustomData,
  replaceActorAliasLayoutReferences,
  createActorAliasDefaultValue,
  createActorAliasCopyDefinition,
  getActorAliasCustomValue
} from "../core/actor-aliases.js";

/**
 * Alias manager UI events and their focused render-state restoration.
 * Domain rules live in core/actor-aliases.js; this module coordinates the UI
 * and the Actor/layout persistence boundary.
 */
export function activateActorAliasListeners(sheet, html, dependencies) {
  const {
    clone, getPath, invalidateNativePropertyCache, getNativePropertyDefinitions,
    invalidateAliasDefinitionCache, getAliasDefinitions, getCustomAliasData,
    normalizeAliasDefinition, safeAliasKey, resolveNexusBinding, evaluateAliasExpression
  } = dependencies;

  // Serialize mutations from this editor with other Actor property writes.
  // The queue is per Actor and local to this client; it is not a cross-client lock.
  const bindSerialized = (selector, eventName, handler) => {
    html.find(selector).on(eventName, event => {
      serializeActorPropertyWrite(sheet.actor, () => handler(event)).catch(error => {
        console.error("NEXUS | Falha ao atualizar propriedades e aliases.", error);
        ui.notifications?.error?.("Não foi possível salvar a alteração. Confira os dados antes de continuar.");
      });
    });
  };

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

  const persistAliases = async (aliases, focusTarget = null) => {
    const normalized = aliases.map(normalizeAliasDefinition).filter(Boolean);
    await sheet.actor.setFlag("nexus", "aliases", normalized);
    invalidateAliasDefinitionCache(sheet.actor);
    await renderDataEditorPreservingState(focusTarget);
  };
  const createAlias = async (label, type, valueType, source, targetPath, focusTarget = null) => {
    const aliases = getAliasDefinitions(sheet.actor).map(normalizeAliasDefinition).filter(Boolean);
    const category = type === "attribute" ? "attributes" : type === "resource" ? "resources" : type === "combat" ? "combat" : type === "identity" ? "identity" : "custom";
    const key = createUniqueActorAliasKey(category, label, aliases, getNativePropertyDefinitions(sheet.actor));
    if (!key) return false;
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
      foundry.utils.setProperty(customData, key, createActorAliasDefaultValue({ type: finalType, label: String(label) }));
      await sheet.actor.setFlag("nexus", "customData", customData);
    }
    await sheet.actor.setFlag("nexus", "aliases", aliases);
    invalidateAliasDefinitionCache(sheet.actor);
    sheet._selectedAliasId = id;
    await renderDataEditorPreservingState(focusTarget);
    return true;
  };
  bindSerialized("[data-alias-create]", "click", async event => {
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
  bindSerialized("[data-native-property-field]", "change", async event => {
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
      const suffix = slugifyActorAlias(input.value);
      const nextKey = createUniqueActorAliasKey(property.category, suffix, getAliasDefinitions(sheet.actor), definitions, id);
      if (!suffix || !nextKey || nextKey !== `${property.category}.${suffix}`) { ui.notifications?.warn?.("Esse identificador já está em uso ou é inválido."); input.value = property.key.split(".").at(-1); return; }
      const previousKey = property.key;
      const customData = clone(getCustomAliasData(sheet.actor));
      const moveResult = moveActorAliasCustomData(customData, previousKey, nextKey);
      if (moveResult.status === "conflict" || moveResult.status === "invalid") {
        ui.notifications?.warn?.("Não foi possível renomear: já existem dados no caminho de destino.");
        input.value = previousKey.split(".").at(-1);
        return;
      }
      override.key = nextKey;
      override.legacyKeys = [...new Set([...(property.legacyKeys ?? []), previousKey])];
      if (moveResult.changed) await sheet.actor.setFlag("nexus", "customData", customData);
      const layouts = await sheet._readLayouts();
      if (replaceActorAliasLayoutReferences(layouts, previousKey, nextKey) > 0) {
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
      }
    }
    await sheet.actor.setFlag("nexus", "nativeProperties", saved);
    invalidateNativePropertyCache(sheet.actor);
    sheet._selectedNativePropertyId = id; renderDataEditorPreservingState(event.currentTarget);
  });
  bindSerialized("[data-native-property-reset]", "click", async event => {
    const id = event.currentTarget.closest("[data-native-property-row]")?.dataset.nativePropertyRow;
    const property = getNativePropertyDefinitions(sheet.actor).find(item => item.id === id); if (!property) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({ window:{title:"Restaurar dado nativo"}, content:`<p>Restaurar <strong>${Handlebars.escapeExpression(property.defaultLabel)}</strong> ao identificador original?</p>`, yes:{label:"Restaurar"}, no:{label:"Cancelar"}, rejectClose:false });
    if (!confirmed) return;
    const saved = clone(sheet.actor.getFlag("nexus", "nativeProperties") ?? []);
    const override = saved.find(item => item.id === id);
    const oldKey = property.key;
    const customData = clone(getCustomAliasData(sheet.actor));
    if (oldKey !== property.defaultKey) {
      const moveResult = moveActorAliasCustomData(customData, oldKey, property.defaultKey);
      if (moveResult.status === "conflict" || moveResult.status === "invalid") {
        ui.notifications?.warn?.("Não foi possível restaurar: já existem dados no identificador original.");
        return;
      }
    }
    if (override) {
      override.legacyKeys = [...new Set([...(override.legacyKeys ?? []), oldKey])];
      override.key = property.defaultKey; override.label = property.defaultLabel;
    }
    const defaultMeta = getPath(customData, property.defaultKey);
    if (defaultMeta && typeof defaultMeta === "object") { delete defaultMeta.checkbonus; delete defaultMeta.roll; }
    await sheet.actor.setFlag("nexus", "customData", customData);
    if (oldKey !== property.defaultKey) {
      const layouts = await sheet._readLayouts();
      if (replaceActorAliasLayoutReferences(layouts, oldKey, property.defaultKey) > 0) {
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
      }
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
  bindSerialized("[data-alias-field]", "change", async event => {
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
      if (["number", "text", "url", "image", "boolean"].includes(input.value)) {
        alias.type = input.value;
        if (alias.type !== "number") { alias.calculationMode = "manual"; alias.formula = ""; }
      }
    }
    else if (field === "calculationMode") {
      if (input.value === "formula" && !["attribute", "resource", "number"].includes(alias.type)) { ui.notifications?.warn?.("Fórmulas estão disponíveis para propriedades numéricas."); input.value = "manual"; return; }
      if (input.value === "formula" && !String(alias.formula ?? "").trim()) { ui.notifications?.warn?.("Informe uma fórmula antes de ativar o cálculo automático."); input.value = "manual"; return; }
      if (input.value === "formula" && evaluateAliasExpression(sheet.actor, alias.formula) === null) { ui.notifications?.warn?.("A fórmula contém uma referência inválida ou não numérica."); input.value = "manual"; return; }
      alias.calculationMode = input.value === "formula" ? "formula" : "manual";
    }
    else if (field === "formula") {
      const formula = String(input.value ?? "").trim().slice(0, 240);
      if (formula && evaluateAliasExpression(sheet.actor, formula) === null) { ui.notifications?.warn?.("Fórmula inválida. Confira as propriedades e os operadores."); input.value = alias.formula ?? ""; return; }
      alias.formula = formula; alias.calculationMode = formula ? "formula" : "manual";
    }
    else if (field === "keySuffix") {
      const suffix = slugifyActorAlias(input.value);
      const next = createUniqueActorAliasKey(alias.category, suffix, aliases, getNativePropertyDefinitions(sheet.actor), alias.id);
      if (!suffix || !next || next !== `${alias.category}.${suffix}`) { input.value = alias.key.split(".").at(-1); return; }
      const previousKey = alias.key;
      alias.legacyKeys ??= []; if (!alias.legacyKeys.includes(previousKey)) alias.legacyKeys.push(previousKey);
      const customData = clone(getCustomAliasData(sheet.actor));
      const moveResult = alias.targetPath
        ? { status: "skipped", changed: false }
        : moveActorAliasCustomData(customData, previousKey, next);
      if (moveResult.status === "conflict" || moveResult.status === "invalid") {
        ui.notifications?.warn?.("Não foi possível renomear: já existem dados no caminho de destino.");
        input.value = previousKey.split(".").at(-1);
        return;
      }
      if (moveResult.changed) await sheet.actor.setFlag("nexus", "customData", customData);
      // Migra referências de componentes para que a troca do identificador
      // não deixe cartões apontando para o caminho antigo.
      const layouts = await sheet._readLayouts();
      if (replaceActorAliasLayoutReferences(layouts, previousKey, next) > 0) {
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
      }
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
  bindSerialized("[data-alias-copy]", "click", async event => {
    const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
    const aliases = getAliasDefinitions(sheet.actor).map(normalizeAliasDefinition).filter(Boolean);
    const source = aliases.find(item => item.id === id); if (!source) return;
    const key = createUniqueActorAliasKey(source.category, `${source.key.split(".").at(-1)}_copy`, aliases, getNativePropertyDefinitions(sheet.actor));
    if (!key) return;
    const copy = createActorAliasCopyDefinition(source, key, foundry.utils.randomID());
    if (!copy) return;
    aliases.push(copy);
    const customData = clone(getCustomAliasData(sheet.actor));
    const original = getActorAliasCustomValue(customData, source);
    if (original !== undefined) foundry.utils.setProperty(customData, key, clone(original));
    else foundry.utils.setProperty(customData, key, createActorAliasDefaultValue(copy));
    await sheet.actor.setFlag("nexus", "customData", customData);
    await sheet.actor.setFlag("nexus", "aliases", aliases);
    invalidateAliasDefinitionCache(sheet.actor); sheet._selectedAliasId = copy.id; renderDataEditorPreservingState(event.currentTarget);
  });
  bindSerialized("[data-alias-reset]", "click", async event => {
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
    const defaultKey = createUniqueActorAliasKey(
      alias.category, alias.label, aliases, getNativePropertyDefinitions(sheet.actor), alias.id
    );
    if (!defaultKey) return;
    if (defaultKey !== alias.key) {
      const previousKey = alias.key;
      const moveResult = alias.targetPath
        ? { status: "skipped", changed: false }
        : moveActorAliasCustomData(customData, previousKey, defaultKey);
      if (moveResult.status === "conflict" || moveResult.status === "invalid") {
        ui.notifications?.warn?.("Não foi possível restaurar: já existem dados no identificador original.");
        return;
      }
      alias.legacyKeys ??= []; if (!alias.legacyKeys.includes(previousKey)) alias.legacyKeys.push(previousKey);
      const layouts = await sheet._readLayouts();
      if (replaceActorAliasLayoutReferences(layouts, previousKey, defaultKey) > 0) {
        await sheet._writeLayouts(layouts, sheet._activeLayoutId());
      }
      alias.key = defaultKey;
    }
    if (!alias.targetPath) {
      foundry.utils.setProperty(customData, alias.key, createActorAliasDefaultValue(alias));
      await sheet.actor.setFlag("nexus", "customData", customData);
    }
    await sheet.actor.setFlag("nexus", "aliases", aliases);
    invalidateAliasDefinitionCache(sheet.actor); renderDataEditorPreservingState(event.currentTarget);
  });
  bindSerialized("[data-alias-delete]", "click", async event => {
    const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
    await persistAliases(getAliasDefinitions(sheet.actor).filter(item => item.id !== id), event.currentTarget);
  });
}
