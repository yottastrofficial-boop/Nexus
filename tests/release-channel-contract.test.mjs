import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const workflow = read("../.github/workflows/release.yml");
const policy = read("../docs/RELEASE_STABILITY_POLICY.md");

assert.ok(workflow.includes(String.raw`const stableMarker = /(?:^|\s)\[release\](?=$|\s)/m;`),
  "A publicação estável deve exigir o marcador exato [release].");
assert.ok(workflow.includes('channel = "stable";'),
  "Somente o marcador [release] na main deve habilitar publicação.");
assert.match(workflow, /if: needs\.validate\.outputs\.channel == 'stable'/,
  "Somente o canal estável pode publicar uma release.");
assert.match(workflow, /if: needs\.validate\.outputs\.channel == 'stable'\n\s+uses: actions\/github-script@v7/,
  "Somente releases estáveis podem atualizar o manifesto do Foundry.");
assert.match(workflow, /make_latest: \$\{\{ needs\.validate\.outputs\.channel == 'stable' && 'true' \|\| 'false' \}\}/,
  "A publicação deve marcar a versão estável como latest.");
assert.match(workflow, /Check existing release[\s\S]*?TARGET_SHA.*GITHUB_SHA[\s\S]*?ASSET_STATE[\s\S]*?uploaded/,
  "Uma release existente só pode ser reutilizada se a tag apontar para o commit e o ZIP estiver enviado.");
assert.match(workflow, /Publish GitHub Release\n\s+if: steps\.release_state\.outputs\.exists != 'true'/,
  "Uma release verificada deve ser ignorada em reexecução segura.");
assert.match(workflow, /overwrite_files: false/,
  "Os assets publicados devem permanecer imutáveis.");
assert.doesNotMatch(workflow, /candidate|prerelease|-rc\./i,
  "O workflow não deve conter canal de candidata ou pré-release.");
assert.match(policy, /Uma release estável só é publicada/,
  "A política deve documentar a publicação exclusivamente estável.");
assert.match(policy, /manifest\.json/);
assert.doesNotMatch(policy, /candidata|pré-release|prerelease/i,
  "A política não deve manter nomenclatura de canais experimentais.");
assert.match(workflow, /\npermissions:\n  contents: read\n\njobs:/,
  "As permissões padrão do workflow devem ser somente leitura.");
assert.match(workflow, /needs: validate\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write/,
  "Somente o job de publicação pode gravar no repositório.");
const validateJob = workflow.slice(workflow.indexOf("  validate:"), workflow.indexOf("  release:"));
assert.doesNotMatch(validateJob, /contents: write/,
  "O job de validação não deve receber permissão de escrita.");

console.log("NEXUS stable-only release contract: OK");
