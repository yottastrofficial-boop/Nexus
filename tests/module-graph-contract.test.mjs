import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoots = ["scripts", "assets"];
const files = sourceRoots.flatMap(rootName => walk(join(root, rootName)));
const fileSet = new Set(files.map(file => normalize(resolve(file))));
const graph = new Map(files.map(file => [normalize(resolve(file)), []]));
const unresolved = [];

function walk(directory, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, result);
    else if (entry.isFile() && extname(path) === ".js") result.push(path);
  }
  return result;
}

function resolveImport(from, specifier) {
  const base = normalize(resolve(dirname(from), specifier));
  const candidates = extname(base) ? [base] : [base + ".js", join(base, "index.js")];
  return candidates.find(candidate => fileSet.has(normalize(resolve(candidate)))) ?? "";
}

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const imports = [
    ...source.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s*)?["']([^"']+)["'];?/g)
  ];
  for (const match of imports) {
    const specifier = match[1];
    if (!specifier.startsWith(".")) continue;
    const target = resolveImport(file, specifier);
    if (!target) unresolved.push({ file: file.slice(root.length + 1), specifier });
    else graph.get(normalize(resolve(file))).push(normalize(resolve(target)));
  }
}

test("todos os imports locais de scripts/assets resolvem para arquivos existentes", () => {
  assert.deepEqual(unresolved, [], "Import local não resolvido:\n" + unresolved.map(item => item.file + " → " + item.specifier).join("\n"));
});

test("grafo de módulos não possui ciclos de import estático", () => {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];

  const visit = node => {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      cycles.push(stack.slice(start).concat(node).map(path => path.slice(root.length + 1)).join(" → "));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };

  for (const node of graph.keys()) visit(node);
  assert.deepEqual(cycles, [], "Ciclos de import:\n" + cycles.join("\n"));
});
