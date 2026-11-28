/**
 * Lightweight, read-only diagnostics for the NEXUS service graph.
 *
 * This snapshot intentionally uses registry.list() only: inspecting system
 * health must never instantiate a lazy service or trigger Foundry side effects.
 */
export function createNexusDiagnostics({
  registry,
  getSystemVersion = () => "",
  getFoundryVersion = () => "",
  isReady = () => false,
  getTimestamp = () => new Date().toISOString()
} = {}) {
  if (typeof registry?.list !== "function") {
    throw new TypeError("NEXUS diagnostics requires a service registry.");
  }

  return Object.freeze({
    snapshot() {
      const services = registry.list().map(service => Object.freeze({
        name: String(service.name),
        dependencies: Object.freeze([...(service.dependencies ?? [])]),
        state: String(service.state ?? "unknown"),
        error: String(service.error ?? "")
      }));
      const states = services.reduce((counts, service) => {
        counts[service.state] = (counts[service.state] ?? 0) + 1;
        return counts;
      }, {});
      const summary = Object.freeze({
        total: services.length,
        ready: states.ready ?? 0,
        registered: states.registered ?? 0,
        initializing: states.initializing ?? 0,
        failed: states.failed ?? 0,
        other: services.filter(service => !["ready", "registered", "initializing", "failed"].includes(service.state)).length
      });

      return Object.freeze({
        system: Object.freeze({
          id: "nexus",
          version: String(getSystemVersion() ?? "")
        }),
        foundry: Object.freeze({
          version: String(getFoundryVersion() ?? ""),
          ready: Boolean(isReady())
        }),
        services: Object.freeze(services),
        summary,
        generatedAt: String(getTimestamp())
      });
    }
  });
}
