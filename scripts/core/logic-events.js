/**
 * Stable event contracts shared by the NEXUS interaction engine and Foundry
 * event adapters. Keep identifiers here; implementations live in adapters.
 */
export const INTERACTION_EVENTS = Object.freeze([
  "click", "doubleClick", "rightClick", "middleClick", "pointerDown",
  "pointerUp", "hold", "hover", "change", "submit", "focus", "blur",
  "keyDown", "keyUp", "interact"
]);

export const INTERACTION_MODIFIERS = Object.freeze(["ctrl", "shift", "alt", "meta"]);
export const INTERACTION_ACTIONS = Object.freeze(["roll", "calculate", "update", "open", "toggle", "interact", "execute"]);
export const INTERACTION_OPERATORS = Object.freeze([
  "equals", "notEquals", "greaterThan", "greaterOrEqual", "lessThan",
  "lessOrEqual", "contains", "isEmpty", "isNotEmpty"
]);

export const FOUNDRY_LOGIC_EVENTS = Object.freeze([
  "actor.created", "actor.updated", "actor.deleted",
  "item.created", "item.updated", "item.deleted",
  "token.created", "token.updated", "token.deleted",
  "combat.created", "combat.updated", "combat.deleted",
  "combat.started", "combat.round", "combat.turn"
]);
