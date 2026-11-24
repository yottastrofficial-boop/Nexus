import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const readText = path => readFile(new URL(path, import.meta.url), "utf8");

const [system, manifest, changelog, readme, roadmap, stability, overview, releaseWorkflow] = await Promise.all([
  readJson("../system.json"),
  readJson("../manifest.json"),
  readText("../CHANGELOG.md"),
  readText("../README.md"),
  readText("../docs/ROADMAP.md"),
  readText("../docs/RELEASE_STABILITY_POLICY.md"),
  readText("../docs/PROJECT_OVERVIEW.md"),
  readText("../.github/workflows/release.yml")
]);

const compareVersions = (left, right) => {
  const a = String(left).split(".").map(Number);
  const b = String(right).split(".").map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta) return Math.sign(delta);
  }
  return 0;
};

assert.equal(system.id, manifest.id, "system.json e manifest.json devem identificar o mesmo sistema.");
assert.ok(compareVersions(manifest.version, system.version) <= 0,
  "O manifesto estável não pode apontar para uma versão mais nova que o pacote candidato.");
assert.equal(manifest.download, "https://github.com/yottastrofficial-boop/Nexus/releases/download/v" + manifest.version + "/nexus.zip",
  "O manifesto estável deve apontar para o ZIP da própria versão publicada.");
const systemDownloadVersion = String(system.download ?? "").match(/\/releases\/download\/v([^/]+)\/nexus\.zip$/)?.[1];
assert.ok(systemDownloadVersion, "system.json deve conter uma URL de download Foundry válida.");
assert.equal(systemDownloadVersion, manifest.version,
  "system.json deve preservar a URL da última release estável publicada.");
assert.equal(system.manifest, "https://raw.githubusercontent.com/yottastrofficial-boop/Nexus/main/manifest.json",
  "system.json deve usar o manifesto estável canônico.");
assert.match(releaseWorkflow, /system\.download =/, "O workflow deve preparar a URL do pacote antes do build estável.");
assert.match(releaseWorkflow, /updateTextFile\("system\.json"/, "O workflow deve sincronizar system.json após confirmar o asset.");
assert.ok(changelog.startsWith("## " + system.version + " —"), "O CHANGELOG deve começar com a versão candidata.");
const changelogVersions = [...changelog.matchAll(/^## (1\.0\.0\.\d+)(?:\s|$)/gm)].map(match => match[1]);
assert.equal(new Set(changelogVersions).size, changelogVersions.length, "O CHANGELOG não pode repetir cabeçalhos de versão.");
assert.doesNotMatch(changelog, /^# NEXUS RPG$/m, "O CHANGELOG não deve conter uma cópia do README.");
assert.ok(readme.includes(system.version), "O README deve mencionar a versão candidata.");
assert.ok(readme.includes("Foundry VTT 14"), "O README deve declarar a linha de compatibilidade atual.");
assert.ok(roadmap.includes(system.version), "O roadmap deve mencionar a versão candidata.");
assert.ok(overview.includes(system.version), "A visão do projeto deve mencionar a versão candidata.");
assert.ok(stability.includes(system.version), "A política de estabilidade deve distinguir a versão candidata.");
assert.ok(stability.toLowerCase().includes("último checkpoint funcional confirmado") && stability.includes("1.0.0.70"),
  "A política deve manter explícito o último checkpoint funcional comprovado.");

console.log("NEXUS | Consistência documental aprovada para a versão candidata " + system.version + " (manifesto publicado: " + manifest.version + ").");
