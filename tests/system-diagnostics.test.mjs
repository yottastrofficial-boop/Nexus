import test from "node:test";
import assert from "node:assert/strict";
import { createNexusDiagnostics } from "../scripts/core/system-diagnostics.js";
import { createNexusServiceRegistry } from "../scripts/core/service-registry.js";

test("snapshot reports system and service states without resolving lazy services", () => {
  let created = 0;
  const registry = createNexusServiceRegistry();
  registry.register("core.lazy", () => { created += 1; return { ready: true }; });
  registry.register("core.ready", () => ({ ready: true }));
  registry.resolveSync("core.ready");

  const diagnostics = createNexusDiagnostics({
    registry,
    getSystemVersion: () => "1.0.0-test",
    getFoundryVersion: () => "14.360",
    isReady: () => true,
    getTimestamp: () => "2026-11-27T23:00:00.000Z"
  });

  const snapshot = diagnostics.snapshot();
  assert.equal(created, 0, "diagnostics must not instantiate a lazy service");
  assert.deepEqual(snapshot.system, { id: "nexus", version: "1.0.0-test" });
  assert.deepEqual(snapshot.foundry, { version: "14.360", ready: true });
  assert.deepEqual(snapshot.summary, {
    total: 2, ready: 1, registered: 1, initializing: 0, failed: 0, other: 0
  });
  assert.equal(snapshot.generatedAt, "2026-11-27T23:00:00.000Z");
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.services), true);
  assert.equal(Object.isFrozen(snapshot.services[0].dependencies), true);
});

test("diagnostics validates its registry dependency", () => {
  assert.throws(() => createNexusDiagnostics(), /service registry/);
});
