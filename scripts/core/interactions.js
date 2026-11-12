/**
 * Contrato comum de interações dos componentes NEXUS.
 *
 * Trigger identifica o evento; Action identifica a operação; Configuration
 * contém somente os parâmetros daquela operação. A interface pode oferecer
 * várias ações encadeadas para o mesmo trigger.
 */
export const INTERACTION_EVENTS = Object.freeze(["click", "change", "submit", "hover"]);
export const INTERACTION_ACTIONS = Object.freeze([
  "roll", "calculate", "update", "open", "toggle", "interact", "execute"
]);

const LEGACY_ACTIONS = Object.freeze({
  roll: { event: "click", type: "roll", config: component => ({ formula: component.rollFormula ?? "" }) },
  "toggle-component": { event: "click", type: "toggle", config: component => ({ targetId: component.actionTargetId ?? "" }) }
});

export function normalizeInteraction(interaction) {
  if (!interaction || typeof interaction !== "object") return null;
  const event = String(interaction.trigger?.event ?? interaction.trigger ?? "").trim();
  if (!INTERACTION_EVENTS.includes(event) || !Array.isArray(interaction.actions)) return null;
  const actions = interaction.actions
    .filter(action => action && typeof action === "object" && INTERACTION_ACTIONS.includes(action.type))
    .map((action, index) => ({
      id: String(action.id ?? `action-${index + 1}`),
      type: action.type,
      config: action.config && typeof action.config === "object" && !Array.isArray(action.config) ? { ...action.config } : {}
    }));
  if (!actions.length) return null;
  return {
    id: String(interaction.id ?? "interaction-default"),
    trigger: { event },
    enabled: interaction.enabled !== false,
    actions
  };
}

export function getComponentInteractions(component) {
  const configured = Array.isArray(component?.interactions)
    ? component.interactions.map(normalizeInteraction).filter(Boolean)
    : [];
  if (configured.length) return configured;
  const legacy = LEGACY_ACTIONS[component?.actionType];
  if (!legacy) return [];
  return [{
    id: "legacy-" + component.actionType,
    trigger: { event: legacy.event },
    enabled: true,
    actions: [{ id: "legacy-action", type: legacy.type, config: legacy.config(component) }]
  }];
}

export function getTriggeredActions(component, eventName = "click") {
  return getComponentInteractions(component)
    .filter(interaction => interaction.enabled && interaction.trigger.event === eventName)
    .flatMap(interaction => interaction.actions);
}

export async function executeTriggeredActions(component, eventName, executeAction) {
  if (typeof executeAction !== "function") return [];
  const results = [];
  for (const action of getTriggeredActions(component, eventName)) {
    results.push(await executeAction(action, component));
  }
  return results;
}
