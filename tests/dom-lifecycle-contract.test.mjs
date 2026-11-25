import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sheetListeners = read("../scripts/sheets/actor-sheet-listeners.js");
const sheet = read("../scripts/sheets/actor-sheet-v1.0.0.js");
const designStudio = read("../scripts/apps/design-studio.js");
const libraryApplication = read("../scripts/library/library-application.js");

assert.match(sheetListeners, /const escapeHtml = value => String\(value \?\? ""\)/,
  "Dynamic HTML values must pass through a dedicated escaping utility.");
assert.doesNotMatch(sheetListeners, /detail\.innerHTML\s*=\s*`[^\n]*\$\{asset\.label\}/,
  "Catalog labels must be inserted as text, not interpolated into HTML.");
assert.doesNotMatch(sheetListeners, /picker\.addEventListener\("cancel"/,
  "The character sheet must not retain file pickers from the removed embedded library.");
assert.match(libraryApplication, /data-library-backup-import-file/,
  "File import belongs to the shared Universal Library application.");
assert.match(sheet, /list\.dataset\.nexusPropertyOwner === String\(this\.id\)\) list\.remove\(\)/,
  "The property picker portal must be removed when its owning sheet closes.");
assert.match(sheet, /finally\s*\{\s*field\.remove\(\)/,
  "Temporary clipboard fields must be removed even if copying fails.");
assert.match(designStudio, /input\.addEventListener\("cancel", cleanupInput/,
  "The design profile import picker must be removed on cancellation.");
assert.match(libraryApplication, /finally\s*\{\s*field\.remove\(\)/,
  "The library clipboard fallback must always remove its temporary textarea.");

console.log("NEXUS DOM lifecycle contract: OK");
