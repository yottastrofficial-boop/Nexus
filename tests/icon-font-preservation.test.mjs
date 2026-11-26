import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const legacy = readFileSync(new URL("../styles/nexus-v1.0.0.css", import.meta.url), "utf8");
const design = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const faExclusion = ':not([class*="fa-"]):not([class~="fa"]):not([class~="fas"]):not([class~="far"]):not([class~="fab"]):not([class~="fal"]):not([class~="fad"])';

assert.ok(legacy.includes(`button${faExclusion}`),
  "Floating rails and resource controls must not replace Font Awesome button fonts.");
assert.ok(legacy.includes(`:is(strong,b,small,span,label,input,textarea,button)${faExclusion}`),
  "Component content typography must exclude icon spans and icon buttons.");
assert.ok(legacy.includes(`:is(button, input, select, textarea)${faExclusion}`),
  "NEXUS ApplicationV2 controls must preserve directly assigned Font Awesome classes.");
assert.ok(design.includes(`:is(button, input, select, textarea)${faExclusion}`),
  "Global profile typography must attach icon exclusions to the control itself.");
assert.ok(design.includes(`:is(#hotbar, #navigation) :is(button, input, select, textarea)${faExclusion}`),
  "Hotbar and navigation typography must not override native icon controls.");
assert.doesNotMatch(legacy,
  /\.nexus-component-content :is\(strong,b,small,span,label,input,textarea,button\)\s*\{[^}]*font-family\s*:\s*inherit/,
  "A broad component-content font rule must not reach Font Awesome elements.");
assert.doesNotMatch(legacy,
  /html\.nexus-design-system :is\([^{}]*\) :is\(button, input, select, textarea\)\s*\{[^}]*font-family\s*:\s*inherit/,
  "A broad ApplicationV2 font rule must not reach Font Awesome controls.");

console.log("NEXUS Font Awesome preservation audit: OK");
