import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeCanvasFitScale, installCanvasFit } from "../scripts/sheets/canvas-fit.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const designCss = read("styles/nexus-design-system.css");
const legacyCss = read("styles/nexus-v1.0.0.css");
const template = read("templates/actors/actor-sheet.hbs");
const sheetSource = read("scripts/sheets/actor-sheet-v1.0.0.js");

// --- Pure scale computation -------------------------------------------------
assert.equal(computeCanvasFitScale({ viewportWidth: 1000, viewportHeight: 1000, canvasWidth: 800, canvasHeight: 800 }), 1, "Nunca amplia o Canvas");
assert.equal(computeCanvasFitScale({ viewportWidth: 780, viewportHeight: 700, canvasWidth: 800, canvasHeight: 800 }), 0.875, "Reduz pelo eixo mais restritivo");
assert.equal(computeCanvasFitScale({ viewportWidth: 10, viewportHeight: 10, canvasWidth: 800, canvasHeight: 800 }), 0.25, "Respeita o limite mínimo");
assert.equal(computeCanvasFitScale({ viewportWidth: 0, viewportHeight: 700, canvasWidth: 800, canvasHeight: 800 }), 1, "Viewport inválido não distorce");
assert.equal(computeCanvasFitScale({ viewportWidth: 500, viewportHeight: 500, canvasWidth: "x", canvasHeight: 800 }), 1, "Dimensões inválidas não distorcem");

// --- DOM integration with fakes ---------------------------------------------
const observers = [];
globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; this.connected = true; observers.push(this); } observe() {} disconnect() { this.connected = false; } };
globalThis.getComputedStyle = () => ({ paddingLeft: "10px", paddingRight: "10px", paddingTop: "10px", paddingBottom: "10px" });
const values = {};
const canvas = { isConnected: true, dataset: { layoutWidth: "800", layoutHeight: "800" }, style: { setProperty: (key, value) => { values[key] = value; } } };
const scroller = { clientWidth: 800, clientHeight: 720 };
const root = { dataset: { mode: "play" }, querySelector: selector => selector === ".nexus-canvas-scroll" ? scroller : selector === ".nexus-canvas" ? canvas : null };
const cleanup = installCanvasFit(root);
assert.equal(values["--nexus-fit-scale"], "0.875", "Modo padrão ajusta o Canvas (720-20)/800");
root.dataset.mode = "appearance"; observers[0].cb();
assert.equal(values["--nexus-fit-scale"], "1", "Modo Aparência edita em pixels reais");
root.dataset.mode = "config"; scroller.clientWidth = 1200; scroller.clientHeight = 1200; observers[0].cb();
assert.equal(values["--nexus-fit-scale"], "1", "Janela grande não reduz");
cleanup();
assert.equal(observers.every(observer => !observer.connected), true, "A limpeza desconecta os observadores");
assert.equal(typeof installCanvasFit({ querySelector: () => null }), "function", "Sem DOM, retorna limpeza vazia");

assert.match(sheetSource, /this\._nexusViewportCleanup\?\.\(\);\s*this\._nexusViewportCleanup = installCanvasFit\(form\);/, "A ficha instala o ajuste a cada renderização e libera o anterior");
assert.match(designCss, /\.nexus-sheet:is\(\[data-mode="play"\], \[data-mode="config"\]\) \.nexus-canvas \{[^}]*scale\(var\(--nexus-fit-scale, 1\)\)/, "O CSS aplica a escala somente nos modos padrão e configuração");

// --- Grid: each mode has exactly one workspace column ------------------------
const rules = css => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), body: match[2] }));
for (const [name, css] of [["design", designCss], ["legacy", legacyCss]]) {
  for (const rule of rules(css)) {
    if (!/\.nexus-workspace(?![-\w])/.test(rule.selector) || /nexus-workspace-clean/.test(rule.selector)) continue;
    if (!/\[data-mode="(play|config)"\]|\.nexus-sheet \.nexus-workspace\s*$/.test(rule.selector) && !/^html\.nexus-design-system \.nexus-sheet \.nexus-workspace$/.test(rule.selector)) continue;
    const columns = rule.body.match(/grid-template-columns:\s*([^;]+);/)?.[1] ?? "";
    assert.doesNotMatch(columns, /\d+px/, `${name}: modo padrão/configuração não pode reservar coluna lateral (${rule.selector})`);
  }
}
assert.doesNotMatch(template, /class="[^"]*nexus-sidebar-right/, "O modelo não possui trilho lateral permanente");

// --- Native sidebar container must stay unpainted ---------------------------
for (const [name, css] of [["design", designCss], ["legacy", legacyCss]]) {
  for (const rule of rules(css)) {
    const parts = rule.selector.split(",").map(part => part.trim());
    const paintsContainer = parts.some(part => /#sidebar$/.test(part) || /#sidebar \.sidebar-tabs$/.test(part) || /#sidebar-tabs$/.test(part) && false);
    if (!paintsContainer) continue;
    assert.doesNotMatch(rule.body, /(^|;|\s)(background|background-color|box-shadow|border-radius|overflow|display|width|position)\s*:/, `${name}: #sidebar (contêiner das abas flutuantes) não pode receber fundo/geometria (${rule.selector})`);
  }
}
console.log("NEXUS sheet layout fit and native sidebar container contract: OK");
