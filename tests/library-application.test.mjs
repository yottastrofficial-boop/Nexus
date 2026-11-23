import test from "node:test";
import assert from "node:assert/strict";
import { createLibraryApplicationClass } from "../scripts/library/library-application.js";

test("a Biblioteca pode ser construída sem dependência da ficha", () => {
  class FakeApplicationV2 {
    constructor(options = {}) { this.options = options; }
    async _prepareContext() { return {}; }
    async _onRender() {}
    async close() { return this; }
  }
  const FakeMixin = Base => class extends Base {};
  const registry = { list: async () => ({ items: [], total: 0, hasMore: false, cursor: {} }) };
  const getPreferences = () => ({ schemaVersion: 1, folders: [], assignments: {}, favorites: [], recent: [] });
  const savePreferences = async value => value;

  const LibraryApplication = createLibraryApplicationClass({
    ApplicationV2: FakeApplicationV2,
    HandlebarsApplicationMixin: FakeMixin,
    registry,
    getPreferences,
    savePreferences
  });
  const application = new LibraryApplication();

  assert.ok(application instanceof FakeApplicationV2);
  assert.equal(LibraryApplication.PARTS.main.template, "systems/nexus/templates/library/library.hbs");
  assert.ok(LibraryApplication.DEFAULT_OPTIONS.classes.includes("nexus-library-application"));
  assert.strictEqual(application._registry, registry);
});

test("a criação da aplicação rejeita contratos incompletos", () => {
  assert.throws(() => createLibraryApplicationClass({}), /ApplicationV2/);
  assert.throws(() => createLibraryApplicationClass({
    ApplicationV2: class {},
    HandlebarsApplicationMixin: Base => Base,
    registry: {},
    getPreferences: () => ({}),
    savePreferences: async () => {}
  }), /catálogo universal/);
});
