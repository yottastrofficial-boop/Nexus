import assert from "node:assert/strict";
import { validateDesignCss, buildDesignCustomCss } from "../scripts/core/design-custom-css.js";
import { createDefaultDesignProfile, normalizeDesignProfile, exportDesignProfile, importDesignProfile } from "../scripts/core/design-profile.js";

const valid = validateDesignCss(`:scope {
  box-shadow: 0 4px 16px #0005;
  transition: transform 180ms ease, box-shadow 180ms ease;
}
:scope:hover {
  transform: translateY(-2px);
}
:scope:focus-visible {
  outline: 2px solid #78b7e8;
}`);
assert.equal(valid.valid, true, valid.error);
assert.match(valid.css, /:scope:hover/);
assert.equal(validateDesignCss("body { display:none; }").valid, false);
assert.equal(validateDesignCss(":scope { background: url(https://example.com/x); }").valid, false);
assert.equal(validateDesignCss("@import url(https://example.com/a.css);").valid, false);
assert.equal(validateDesignCss(":scope { position: fixed; }").valid, false);
assert.equal(validateDesignCss(":scope { animation-name: evil; }").valid, false);
assert.equal(validateDesignCss(":scope { animation-name: nexus-pulse; }").valid, true);

const built = buildDesignCustomCss({ buttons: valid.css, panels: ":scope { animation-name: nexus-pulse; }" });
assert.match(built, /\.nexus-design-surface/);
assert.match(built, /@keyframes nexus-pulse/);
assert.doesNotMatch(built, /body\s*\{/);

const profile = createDefaultDesignProfile();
profile.customCss.buttons = valid.css;
const normalized = normalizeDesignProfile(profile);
assert.equal(normalized.schemaVersion, 3);
assert.equal(normalized.customCss.buttons, valid.css);
assert.equal(normalized.customCss.panels, "");
const exported = exportDesignProfile(normalized);
assert.equal(importDesignProfile(exported).customCss.buttons, valid.css);
const legacy = importDesignProfile({ format: "NEXUS-DESIGN/2", profile: { schemaVersion: 2, preset: "nexus-dark" } });
assert.equal(legacy.schemaVersion, 3);
assert.deepEqual(legacy.customCss, { buttons: "", panels: "", containers: "", highlights: "", fields: "" });

console.log("Advanced CSS validation, scoping and profile migration: OK");
