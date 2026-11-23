import test from "node:test";
import assert from "node:assert/strict";
import {
  createLibraryDefinition,
  createLibraryComponentInstance,
  getLibraryDefinitionUpdateStatus,
  updateLibraryComponentInstance,
  planLibraryDefinitionUpdate
} from "../scripts/core/library-models.js";

test("atualização controlada preserva overrides reais e aplica novos padrões", () => {
  const original = createLibraryDefinition({
    id: "definition-text",
    type: "text",
    version: 1,
    settings: { text: "Texto antigo", width: 100, color: "blue" }
  });
  const instance = createLibraryComponentInstance(original, {
    id: "instance-1",
    position: { x: 24, y: 36 },
    overrides: { color: "red" }
  });
  instance.z = 7;
  instance.stackOrder = 4;

  const updatedDefinition = createLibraryDefinition({
    id: "definition-text",
    type: "text",
    version: 2,
    settings: { text: "Texto novo", width: 160, height: 48, color: "blue" },
    history: [{ version: 1, settings: original.settings }]
  });

  assert.equal(getLibraryDefinitionUpdateStatus(updatedDefinition, instance), "update-available");
  const updated = updateLibraryComponentInstance(updatedDefinition, instance);
  assert.equal(updated.text, "Texto novo");
  assert.equal(updated.width, 160);
  assert.equal(updated.height, 48);
  assert.equal(updated.color, "red");
  assert.equal(updated.x, 24);
  assert.equal(updated.y, 36);
  assert.equal(updated.z, 7);
  assert.equal(updated.stackOrder, 4);
  assert.equal(updated.libraryDefinitionVersion, 2);
  assert.equal(updated.libraryDefinitionBaseline, undefined);
  assert.equal(instance.libraryDefinitionVersion, 1);
});

test("plano lista atualizações e separa instâncias antigas que exigem revisão manual", () => {
  const v1 = createLibraryDefinition({
    id: "definition-meter",
    type: "meter",
    version: 1,
    settings: { value: 10, color: "blue" }
  });
  const linked = createLibraryComponentInstance(v1, { id: "linked-1", overrides: { color: "red" } });
  const legacy = {
    id: "legacy-1",
    type: "meter",
    libraryDefinitionId: "definition-meter",
    libraryDefinitionVersion: 1,
    value: 10,
    color: "blue"
  };
  const v2 = createLibraryDefinition({
    id: "definition-meter",
    type: "meter",
    version: 2,
    settings: { value: 20, color: "blue" },
    history: [{ version: 1, settings: v1.settings }]
  });
  const layouts = {
    principal: { components: [linked] },
    secondary: { components: [legacy] }
  };

  const preview = planLibraryDefinitionUpdate(v2, layouts);
  assert.equal(preview.available.length, 1);
  assert.equal(preview.requiresReview.length, 1);
  assert.equal(preview.updatedCount, 0);
  assert.equal(preview.pendingCount, 1);
  assert.equal(preview.skippedCount, 1);

  const applied = planLibraryDefinitionUpdate(v2, layouts, {
    selectedInstanceKeys: ["principal:linked-1"]
  });
  assert.equal(applied.updatedCount, 1);
  assert.equal(applied.layouts.principal.components[0].value, 20);
  assert.equal(applied.layouts.principal.components[0].color, "red");
  assert.equal(applied.layouts.secondary.components[0].value, 10);
  assert.equal(layouts.principal.components[0].libraryDefinitionVersion, 1);
});

test("instâncias sem vínculo ou com tipo incompatível não recebem atualização", () => {
  const definition = createLibraryDefinition({ id: "d1", type: "text", version: 2 });
  assert.equal(getLibraryDefinitionUpdateStatus(definition, { id: "x", type: "text" }), "unlinked");
  assert.equal(getLibraryDefinitionUpdateStatus(definition, {
    id: "x", type: "other", libraryDefinitionId: "d1", libraryDefinitionVersion: 1,
    libraryDefinitionBaseline: {}
  }), "type-mismatch");
  assert.throws(() => updateLibraryComponentInstance(definition, {
    id: "x", type: "text", libraryDefinitionId: "d1", libraryDefinitionVersion: 1
  }), /baseline-missing/);
});
