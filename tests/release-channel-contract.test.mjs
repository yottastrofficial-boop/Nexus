import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const workflow = read("../.github/workflows/release.yml");
const policy = read("../docs/RELEASE_STABILITY_POLICY.md");

assert.match(workflow, /workflow_dispatch:\n\s+inputs:/,
  "The release workflow must expose an explicit manual action.");
assert.match(workflow, /release_channel:[\s\S]*?options:[\s\S]*?- validate[\s\S]*?- candidate/,
  "Manual dispatch must distinguish validation from candidate publication.");
assert.match(workflow, /candidate_version:[\s\S]*?required: false/,
  "Candidate version must be an explicit input validated at runtime.");
assert.ok(workflow.includes(String.raw`const stableMarker = /(?:^|\s)\[release\](?=$|\s)/m;`),
  "Stable publication must require the exact [release] marker.");
assert.ok(workflow.includes(String.raw`if (!/^\d+\.\d+\.\d+\.\d+-rc\.[1-9]\d*$/.test(candidate))`),
  "Candidate versions must use MAJOR.MINOR.PATCH.BUILD-rc.N.");
assert.match(workflow, /Versões candidatas só podem ser geradas a partir da main/);

const validationIndex = workflow.indexOf("node tests/run-all.mjs");
const candidateMetadataIndex = workflow.indexOf("Apply candidate version to package metadata");
const packageBuildIndex = workflow.indexOf("Build Foundry package");
assert.ok(validationIndex >= 0 && validationIndex < candidateMetadataIndex && candidateMetadataIndex < packageBuildIndex,
  "Candidate metadata must be applied only after the unmodified source passes validation.");
const resolveStep = workflow.slice(workflow.indexOf("Resolve release channel and package version"), validationIndex);
assert.doesNotMatch(resolveStep, /writeFileSync|system\.version\s*=/,
  "Resolving a candidate must not mutate the source package before validation.");
assert.match(workflow, /channel: \$\{\{ steps\.version\.outputs\.channel \}\}/,
  "The resolved channel must be exposed to the release job.");
assert.match(workflow, /if: needs\.validate\.outputs\.channel == 'stable' \|\| needs\.validate\.outputs\.channel == 'candidate'/,
  "Only explicit stable/candidate channels may publish.");
assert.match(workflow, /prerelease: \$\{\{ needs\.validate\.outputs\.channel == 'candidate' \}\}/,
  "Candidate releases must be GitHub pre-releases.");
assert.match(workflow, /make_latest: \$\{\{ needs\.validate\.outputs\.channel == 'stable' && 'true' \|\| 'false' \}\}/,
  "Candidate releases must never become the latest stable release.");
assert.match(workflow, /if: needs\.validate\.outputs\.channel == 'stable'\n\s+uses: actions\/github-script@v7/,
  "Only stable releases may update Foundry's installation manifest.");
assert.match(workflow, /Check existing release[\s\S]*?TARGET_SHA.*GITHUB_SHA[\s\S]*?ASSET_STATE[\s\S]*?uploaded/,
  "An existing release may be reused only when its tag points to this commit and its ZIP is uploaded.");
assert.match(workflow, /Publish GitHub Release\n\s+if: steps\.release_state\.outputs\.exists != 'true'/,
  "A verified existing release must be skipped on a safe workflow rerun.");
assert.match(workflow, /overwrite_files: false/,
  "Published release assets must be immutable.");

assert.match(policy, /## Canais de publicação no GitHub Actions/);
assert.match(policy, /Release candidata/);
assert.match(policy, /Release estável/);
assert.match(policy, /O manifesto estável não é atualizado/);

assert.match(workflow, /\npermissions:\n  contents: read\n\njobs:/,
  "The workflow default must be read-only.");
assert.match(workflow, /needs: validate\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write/,
  "Only the publishing job may write repository contents.");
const validateJob = workflow.slice(workflow.indexOf("  validate:"), workflow.indexOf("  release:"));
assert.doesNotMatch(validateJob, /contents: write/, "The validation job must not receive write access.");

console.log("NEXUS release channel contract: OK");
