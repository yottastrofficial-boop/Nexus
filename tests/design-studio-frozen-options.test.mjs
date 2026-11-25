import assert from "node:assert/strict";
import { createDesignStudioApplicationClass } from "../scripts/apps/design-studio.js";

const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};

class FakeApplicationV2 {
  static DEFAULT_OPTIONS = deepFreeze({
    classes: ["application"],
    position: { width: 600, height: 400 }
  });

  constructor(options = {}) {
    // Mirrors ApplicationV2 normalizing nested position fields in-place.
    const merged = {
      ...this.constructor.DEFAULT_OPTIONS,
      ...options,
      position: { ...this.constructor.DEFAULT_OPTIONS.position, ...(options.position ?? {}) }
    };
    Object.assign(merged.position, { minWidth: 200, minHeight: 120 });
    this.options = merged;
  }
}

const HandlebarsApplicationMixin = Base => class extends Base {};
const design = {
  getProfile: () => ({ preset: "nexus-dark" }),
  saveProfile: async () => true,
  canEditScope: () => true
};

const NexusDesignStudio = createDesignStudioApplicationClass({
  ApplicationV2: FakeApplicationV2,
  HandlebarsApplicationMixin,
  design
});

const frozenMenuOptions = deepFreeze({
  position: { width: 1024, height: 720 },
  window: { title: "Menu" }
});

assert.doesNotThrow(() => new NexusDesignStudio(frozenMenuOptions));
const instance = new NexusDesignStudio(frozenMenuOptions);
assert.equal(instance.options.position.minWidth, 200);
assert.equal(instance.options.position.width, 1024);
assert.equal(Object.isFrozen(NexusDesignStudio.DEFAULT_OPTIONS.position), false);
assert.equal(NexusDesignStudio.DEFAULT_OPTIONS.position.minWidth, 980);
console.log("Design Studio accepts frozen Foundry submenu options.");
