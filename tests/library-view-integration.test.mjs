import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sheetTemplate = await readFile(new URL("../templates/actors/actor-sheet.hbs", import.meta.url), "utf8");
const sheetListeners = await readFile(new URL("../scripts/sheets/actor-sheet-listeners.js", import.meta.url), "utf8");
const sheetController = await readFile(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");
const libraryApplication = await readFile(new URL("../scripts/library/library-application.js", import.meta.url), "utf8");

test("character sheet opens the shared Universal Library", () => {
  assert.match(sheetTemplate, /data-open-nexus-library/);
  assert.match(sheetListeners, /game\.nexus\?\.library\?\.open/);
  assert.match(sheetListeners, /source: "actor-sheet"/);
  assert.match(sheetListeners, /createActorSheetLibraryContext/);
  assert.match(sheetListeners, /canApplyResource/);
  assert.match(sheetListeners, /applyResource/);
  assert.match(sheetListeners, /getUpdateInfo/);
  assert.match(sheetListeners, /updateDefinition/);
  assert.match(sheetListeners, /updateInstances/);
  assert.match(sheetListeners, /getLibraryMediaInsertionSource/);
  assert.match(libraryApplication, /id: "nexus-library"/);
});

test("character sheet no longer mounts the legacy embedded library", () => {
  assert.doesNotMatch(sheetTemplate, /nexus-library-panel|data-tool-panel="library"/);
  assert.doesNotMatch(sheetListeners, /mountLibraryView|nexus-library-panel/);
  assert.doesNotMatch(sheetController, /_mountLibrary\(/);
});
