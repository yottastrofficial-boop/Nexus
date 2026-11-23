import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const readText = path => readFile(new URL(path, import.meta.url), "utf8");

const [system, manifest, changelog, readme, roadmap, stability, overview] = await Promise.all([
  readJson("../system.json"),
  readJson("../manifest.json"),
  readText("../CHANGELOG.md"),
  readText("../README.md"),
  readText("../docs/ROADMAP.md"),
  readText("../docs/RELEASE_STABILITY_POLICY.md"),
  readText("../docs/PROJECT_OVERVIEW.md")
]);

assert.equal(system.version, manifest.version, "system.json e manifest.json devem declarar a mesma versão.");
assert.match(manifest.download, new RegExp(`/releases/download/v${system.version}/nexus\\.zip$`), "O download do manifesto deve apontar para o ZIP da mesma versão.");
assert.match(changelog, new RegExp(`^## ${system.version.replaceAll(".", "\\\\.")}(?:\\s|—)`, "m"), "O CHANGELOG deve começar com a versão publicada.");
assert.ok(readme.includes(system.version), "O README deve mencionar a versão atual.");
assert.ok(readme.includes("Foundry VTT 14"), "O README deve declarar a linha de compatibilidade atual.");
assert.ok(roadmap.includes(system.version), "O roadmap deve mencionar a versão atual.");
assert.ok(overview.includes(system.version), "A visão do projeto deve mencionar a versão atual.");
assert.ok(stability.includes(system.version), "A política de estabilidade deve distinguir a versão publicada atual.");
assert.match(stability, /último checkpoint funcional confirmado[\s\S]*?1\.0\.0\.70/i, "A política deve manter explícito o último checkpoint funcional comprovado.");

console.log(`NEXUS | Consistência documental aprovada para a versão ${system.version}.`);
