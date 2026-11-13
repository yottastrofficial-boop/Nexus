/**
 * Núcleo de interações dos componentes NEXUS.
 * Um fluxo reúne múltiplos Triggers, condições e Actions ordenadas.
 * A execução é sequencial por padrão e nunca avalia JavaScript arbitrário.
 */
export const INTERACTION_EVENTS = Object.freeze([
  "click", "doubleClick", "rightClick", "hover", "change", "submit",
  "propertyUpdate", "drag", "drop", "open", "close"
]);

export const INTERACTION_ACTIONS = Object.freeze([
  "roll", "calculate", "update", "open", "toggle", "interact", "execute"
]);

export const INTERACTION_OPERATORS = Object.freeze([
  "equals", "notEquals", "greaterThan", "greaterOrEqual",
  "lessThan", "lessOrEqual", "contains", "truthy", "falsy"
]);

const MAX_ACTIONS = 20;
const MAX_TRIGGERS = 12;
const MAX_CONDITIONS = 12;
const MAX_TEXT = 500;

const LEGACY_ACTIONS = Object.freeze({
  roll: { event: "click", type: "roll", config: component => ({ formula: component.rollFormula ?? "" }) },
  "toggle-component": { event: "click", type: "toggle", config: component => ({ targetId: component.actionTargetId ?? "" }) }
});

const cleanText = (value, max = MAX_TEXT) => String(value ?? "").trim().slice(0, max);
const isRecord = value => !!value && typeof value === "object" && !Array.isArray(value);

function normalizeTrigger(trigger, index = 0) {
  const event = cleanText(trigger?.event ?? trigger?.type ?? trigger, 40);
  if (!INTERACTION_EVENTS.includes(event)) return null;
  return { id: cleanText(trigger?.id, 80) || `trigger-${index + 1}`, event };
}

function normalizeCondition(condition, index = 0) {
  if (!isRecord(condition)) return null;
  const path = cleanText(condition.path, 180).replace(/^(actor|system)\./, "");
  const operator = INTERACTION_OPERATORS.includes(condition.operator) ? condition.operator : "equals";
  if (!/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path)) return null;
  if (path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) return null;
  return {
    id: cleanText(condition.id, 80) || `condition-${index + 1}`,
    path, operator, value: condition.value === undefined ? "" : condition.value
  };
}

function normalizeAction(action, index = 0) {
  if (!isRecord(action) || !INTERACTION_ACTIONS.includes(action.type)) return null;
  const config = isRecord(action.config) ? { ...action.config } : {};
  for (const key of Object.keys(config)) {
    if (typeof config[key] === "string") config[key] = config[key].slice(0, MAX_TEXT);
    else if (!["number", "boolean"].includes(typeof config[key]) && config[key] !== null) delete config[key];
  }
  return {
    id: cleanText(action.id, 80) || `action-${index + 1}`,
    type: action.type,
    enabled: action.enabled !== false,
    config
  };
}

export function normalizeInteraction(interaction, index = 0) {
  if (!isRecord(interaction)) return null;
  const sourceTriggers = Array.isArray(interaction.triggers)
    ? interaction.triggers
    : [interaction.trigger ?? interaction.event];
  const triggers = sourceTriggers.map(normalizeTrigger).filter(Boolean).slice(0, MAX_TRIGGERS);
  const actions = (Array.isArray(interaction.actions) ? interaction.actions : [])
    .map(normalizeAction).filter(Boolean).slice(0, MAX_ACTIONS);
  if (triggers.length > MAX_TRIGGERS || actions.length > MAX_ACTIONS) return null;
  const conditions = (Array.isArray(interaction.conditions) ? interaction.conditions : [])
    .map(normalizeCondition).filter(Boolean).slice(0, MAX_CONDITIONS);
  const mode = interaction.execution?.mode === "sequential" ? "sequential" : "sequential";
  const onError = interaction.execution?.onError === "continue" ? "continue" : "stop";
  return {
    id: cleanText(interaction.id, 80) || `interaction-${index + 1}`,
    name: cleanText(interaction.name, 80) || `Interação ${index + 1}`,
    enabled: interaction.enabled !== false,
    triggers,
    // Compatibilidade temporária para consumidores antigos do contrato.
    trigger: triggers[0] ? { event: triggers[0].event } : null,
    conditions,
    actions,
    execution: { mode, onError }
  };
}

export function getComponentInteractions(component) {
  const configured = Array.isArray(component?.interactions)
    ? component.interactions.map(normalizeInteraction).filter(Boolean)
    : [];
  if (configured.length) return configured;
  const legacy = LEGACY_ACTIONS[component?.actionType];
  if (!legacy) return [];
  return [normalizeInteraction({
    id: "legacy-" + component.actionType,
    name: "Interação antiga",
    trigger: { event: legacy.event },
    actions: [{ id: "legacy-action", type: legacy.type, config: legacy.config(component) }]
  })].filter(Boolean);
}

export function evaluateInteractionConditions(conditions = [], resolveValue = () => undefined) {
  if (!Array.isArray(conditions) || !conditions.length) return true;
  return conditions.every(condition => {
    const actual = resolveValue(condition.path);
    const expected = condition.value;
    const left = Number(actual), right = Number(expected);
    switch (condition.operator) {
      case "notEquals": return actual !== expected && String(actual) !== String(expected);
      case "greaterThan": return Number.isFinite(left) && Number.isFinite(right) && left > right;
      case "greaterOrEqual": return Number.isFinite(left) && Number.isFinite(right) && left >= right;
      case "lessThan": return Number.isFinite(left) && Number.isFinite(right) && left < right;
      case "lessOrEqual": return Number.isFinite(left) && Number.isFinite(right) && left <= right;
      case "contains": return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "").includes(String(expected));
      case "truthy": return !!actual;
      case "falsy": return !actual;
      default: return actual === expected || String(actual) === String(expected);
    }
  });
}

export function getTriggeredActions(component, eventName = "click", context = {}) {
  return getComponentInteractions(component)
    .filter(interaction => interaction.enabled && interaction.triggers.some(trigger => trigger.event === eventName))
    .filter(interaction => context.interactionId ? interaction.id === context.interactionId : true)
    .filter(interaction => evaluateInteractionConditions(
      interaction.conditions,
      path => typeof context.resolveValue === "function" ? context.resolveValue(path) : undefined
    ))
    .flatMap(interaction => interaction.actions.filter(action => action.enabled).map(action => ({
      ...action, interactionId: interaction.id, execution: interaction.execution
    })));
}

export async function executeTriggeredActions(component, eventName, executeAction, context = {}) {
  if (typeof executeAction !== "function") return [];
  const interactions = getComponentInteractions(component)
    .filter(interaction => interaction.enabled && interaction.triggers.some(trigger => trigger.event === eventName))
    .filter(interaction => context.interactionId ? interaction.id === context.interactionId : true)
    .filter(interaction => evaluateInteractionConditions(
      interaction.conditions,
      path => typeof context.resolveValue === "function" ? context.resolveValue(path) : undefined
    ));
  const results = [];
  for (const interaction of interactions) {
    for (const action of interaction.actions) {
      if (!action.enabled) continue;
      try {
        results.push(await executeAction({ ...action, interactionId: interaction.id }, component, context));
      } catch (error) {
        if (interaction.execution.onError !== "continue") throw error;
        results.push({ error, actionId: action.id });
      }
    }
  }
  return results;
}
