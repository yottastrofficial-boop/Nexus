/**
 * Registers the Actor property value editor interactions.
 * Formula parsing and persistence stay isolated from the general sheet listeners.
 */
import { serializeActorPropertyWrite, writePropertyExpression } from "../core/actor-property-writes.js";

export function activateActorPropertyValueListeners(sheet, inspectorNamespace, isSheetOwnedControl, dependencies) {
  const {
    normalizeNexusPropertyPath,
    resolveNexusBinding,
    evaluateNexusExpression,
    evaluateNexusSkillFormula,
    resolveFormulaIdentifier,
    getPath,
    DEFAULT_FOUNDRY_TOKEN_IMAGE,
    isMediaSource,
    getFoundryDefaultTokenImage,
    resolveAliasPath,
    clone,
    getCustomAliasData
  } = dependencies;

      $(document).on(`input${inspectorNamespace}`, "[data-property-value]", event => {
        const input = event.currentTarget;
        if (!isSheetOwnedControl(input)) return;
        if (input.tagName === "TEXTAREA") {
          input.style.height = "auto";
          const lineHeight = Number.parseFloat(getComputedStyle(input).lineHeight) || 16;
          const maxHeight = lineHeight * 5 + 16;
          input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
          input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
        }
      });
      // Confirmar ao sair do campo evita validar fórmulas enquanto ainda estão sendo digitadas.
      $(document).on(`change${inspectorNamespace}`, "[data-property-value]", async event => {
        const input = event.currentTarget;
        if (!isSheetOwnedControl(input)) return;
        await serializeActorPropertyWrite(sheet.actor, async () => {
        const path = normalizeNexusPropertyPath(input.dataset.propertyPath);
        if (!path || path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) return;
        const kind = input.dataset.propertyKind;
        let value = input.value;
        const skillFormulaMatch = path.match(/^skills\.([a-zA-Z0-9_-]+)\.formula$/);
        const resolvedPath = resolveNexusBinding(sheet.actor, path);
        const targetPath = resolvedPath.virtual ? resolvedPath.sourcePath : resolvedPath.path;
        const trimmedValue = typeof value === "string" ? value.trim() : value;
        const expression = typeof value === "string" ? trimmedValue.match(/^\{\{\s*([\s\S]+?)\s*\}\}$/) : null;
        // Aspas fora de {{...}} representam um literal textual, não parte do valor.
        if (!expression && typeof trimmedValue === "string" && /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/.test(trimmedValue)) {
          const quotedValue = evaluateNexusExpression(trimmedValue, () => undefined);
          if (typeof quotedValue === "string") value = quotedValue;
        }
  
        if (expression) {
          const calculated = skillFormulaMatch
            ? evaluateNexusSkillFormula(sheet.actor, skillFormulaMatch[1], String(value))
            : evaluateNexusExpression(expression[1].trim(), identifier =>
                resolveNexusBinding(sheet.actor, resolveFormulaIdentifier(identifier), 1).value
              );
          const valueKind = kind;
          const incompatible = calculated === null
            || (valueKind === "number" && typeof calculated !== "number")
            || (valueKind === "boolean" && typeof calculated !== "boolean")
            || (valueKind === "string" && typeof calculated !== "string");
          if (incompatible || (resolvedPath.readOnly && !resolvedPath.formulaEditable && !skillFormulaMatch)) {
            globalThis.ui?.notifications?.warn?.("Expressão inválida para esta propriedade. Verifique as referências e o tipo do resultado.");
            return;
          }
          if (skillFormulaMatch) {
            await sheet.actor.update({ [`system.skills.${skillFormulaMatch[1]}.formula`]: String(value).trim().slice(0, 500) }, { render: false });
          } else {
            await writePropertyExpression(sheet.actor, path, String(value));
          }
          sheet._refreshBoundComponents();
          return;
        }
        if (skillFormulaMatch) {
          const formula = String(value ?? "").trim().slice(0, 500);
          const source = formula.replace(/^\{\{\s*([\s\S]*?)\s*\}\}$/, "$1");
          const calculated = formula ? evaluateNexusSkillFormula(sheet.actor, skillFormulaMatch[1], formula) : 0;
          if (formula && (typeof calculated !== "number" || !Number.isFinite(calculated))) {
            globalThis.ui?.notifications?.warn?.("Fórmula inválida. Use caminhos de propriedades numéricas e operadores suportados.");
            return;
          }
          await sheet.actor.update({ [`system.skills.${skillFormulaMatch[1]}.formula`]: formula }, { render: false });
          sheet._refreshBoundComponents();
          return;
        }
        const existingExpression = getPath(sheet.actor.getFlag?.("nexus", "propertyExpressions") ?? sheet.actor.flags?.nexus?.propertyExpressions ?? {}, path);
        const valueKind = kind;
        if (resolvedPath.readOnly) {
          if (String(value ?? "").trim() === "" && typeof existingExpression === "string") {
            await writePropertyExpression(sheet.actor, path, null);
            sheet._refreshBoundComponents();
            return;
          }
          input.value = String(resolveNexusBinding(sheet.actor, path).value ?? "");
          globalThis.ui?.notifications?.warn?.("Esta propriedade é calculada ou somente de leitura. Para alterar seu resultado, edite suas dependências ou configure uma fórmula personalizada quando permitido.");
          return;
        }
        if (valueKind === "number") {
          if (String(value).trim() === "") value = 0;
          else if (!Number.isFinite(Number(value))) {
            globalThis.ui?.notifications?.warn?.("Informe um número válido ou uma expressão entre {{ }}.");
            return;
          } else value = Number(value);
        } else if (valueKind === "boolean") {
          if (String(value).trim() === "") value = false;
          else if (!["true", "false"].includes(String(value).trim().toLowerCase())) {
            globalThis.ui?.notifications?.warn?.("Informe true ou false, ou uma referência booleana entre {{ }}.");
            return;
          } else value = String(value).trim().toLowerCase() === "true";
        }
        if (path === "name") await sheet.actor.update({ name: String(value).slice(0, 100) }, { render: false });
        else if (["img", "prototypeToken.texture.src"].includes(targetPath)) {
          const imagePath = String(value).trim().slice(0, 2048);
          if (targetPath === "prototypeToken.texture.src" && !imagePath) {
            await sheet.actor.update({ "prototypeToken.texture.src": DEFAULT_FOUNDRY_TOKEN_IMAGE }, { render: false });
          } else if (!isMediaSource(imagePath)) {
            globalThis.ui?.notifications?.warn?.("Imagem inválida. Informe uma imagem válida ou uma propriedade que contenha uma imagem.");
            input.value = path === "img" || path === "identity.portrait.img" ? (sheet.actor.img ?? "") : getFoundryDefaultTokenImage(sheet.actor);
            return;
          } else {
            await sheet.actor.update(targetPath === "img" ? { img: imagePath } : { [targetPath]: imagePath }, { render: false });
          }
        }
        else if (targetPath === "prototypeToken.ring.colors.ring") {
          const color = String(value).trim();
          if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return;
          await sheet.actor.update({ "prototypeToken.ring.colors.ring": color }, { render: false });
        }
        else if (resolvedPath.alias && !targetPath) {
          // Aliases personalizados e metadados permanecem em flags.nexus.customData.
          const aliasInfo = resolveAliasPath(sheet.actor, path);
          const suffix = aliasInfo.suffix === "exib" ? "exibicao" : aliasInfo.suffix;
          const customPath = [resolvedPath.alias.key, suffix || (["attribute", "resource"].includes(resolvedPath.alias.type) ? "value" : "")].filter(Boolean).join(".");
          const customData = clone(getCustomAliasData(sheet.actor));
          foundry.utils.setProperty(customData, customPath, value);
          await sheet.actor.setFlag("nexus", "customData", customData);
        }
        else {
          const updateTargetPath = String(targetPath || path);
          const actorRootPath = ["name", "img"].includes(updateTargetPath) || updateTargetPath.startsWith("prototypeToken.");
          const updatePath = resolvedPath.virtual && actorRootPath ? updateTargetPath : `system.${updateTargetPath}`;
          await sheet.actor.update({ [updatePath]: value }, { render: false });
        }
        // Persist the replacement value first. If the document update fails,
        // the previous formula remains intact instead of being silently lost.
        if (typeof existingExpression === "string") {
          await writePropertyExpression(sheet.actor, path, null);
        }
        sheet._refreshBoundComponents();
        });
      });
}
