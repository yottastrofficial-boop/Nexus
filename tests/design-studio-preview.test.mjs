import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const template = read("../templates/apps/design-studio.hbs");
const script = read("../scripts/apps/design-studio.js");
const styles = read("../styles/nexus-design-system.css");

test("Design Studio sections switch inside the application without browser navigation", () => {
  assert.match(template, /role="tablist"/);
  assert.match(template, /role="tabpanel" aria-labelledby="nexus-design-tab-palette"/);
  assert.match(template, /aria-selected="true"/);
  for (const section of ["palette", "typography", "layout", "accessibility"]) {
    assert.match(template, new RegExp(`data-design-section="${section}"[^>]*role="tab"`));
    assert.match(template, new RegExp(`data-design-section-panel="${section}"`));
  }
  assert.doesNotMatch(template, /<a[^>]+(?:palette|typography|layout|accessibility)/i);
  assert.doesNotMatch(script, /window\.open|location\.href/);
  assert.match(script, /event\.stopPropagation\(\)/);
});

test("theme preview demonstrates the real visual primitives controlled by the profile", () => {
  for (const sample of [
    "nexus-design-sample-panel",
    "nexus-design-sample-container",
    "nexus-design-sample-buttons",
    "nexus-design-sample-type",
    "nexus-design-sample-scroll"
  ]) assert.ok(template.includes(sample), `Missing theme preview sample: ${sample}`);
  assert.match(template, /<button[^>]*>Ação<\/button>/);
  assert.match(template, /<input type="text"/);
  assert.match(template, /<select/);
  assert.match(template, /<textarea/);
  assert.match(styles, /nexus-design-sample-scroll[\s\S]*?overflow-y:\s*auto/);
});
