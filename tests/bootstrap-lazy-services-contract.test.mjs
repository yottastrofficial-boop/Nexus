import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const bootstrap = readFileSync(root + "scripts/nexus-v1.0.0.js", "utf8");

test("bootstrap defers pure services while keeping init-critical services eager", () => {
  assert.match(bootstrap, /game\.nexus\.design = registerService\("design"/,
    "Design System installs its global hooks/styles during init and remains eager");
  assert.match(bootstrap, /game\.nexus\.library\.registry = registerService\("library\.registry"/,
    "Library registry remains ready for ApplicationV2 registration");
  for (const service of [
    "resources", "library.transfers", "library.backup",
    "media.formats", "media.capabilities", "media.pipeline", "media.storage",
    "logic.registry", "logic.runtime"
  ]) {
    assert.ok(bootstrap.includes(`registerLazyService("${service}"`),
      `Service ${service} should resolve through the lazy public facade`);
  }
  assert.match(bootstrap, /services\.defineAccessor\(target, property, name\)/,
    "Lazy public properties must retain object-shaped service access");
});
