import { NexusActorSheet } from "./sheets/actor-sheet-v1.0.0.js";

Hooks.once("init", () => {
  console.log("NEXUS | Inicializando sistema 1.0.0.1");

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(foundry.documents.Actor, "nexus", NexusActorSheet, {
    types: ["player-character", "npc", "character"],
    makeDefault: true,
    label: "NEXUS — Ficha Modular"
  });
});

Hooks.once("ready", () => {
  console.log("NEXUS | Sistema 1.0.0.1 carregado. Ficha Canvas habilitada.");
});

Hooks.on("preCreateActor", (actor, data, options, userId) => {
  if (!["player-character", "npc", "character"].includes(actor.type)) return;
  const defaults = {
    resources: {
      pv: { value: 10, max: 10 },
      pm: { value: 0, max: 0 },
      pe: { value: 0, max: 0 }
    },
    attributes: { body: 0, mind: 0, soul: 0 },
    combat: { defense: 10, movement: 6, desl: 0, ddr: 0, mb: 0 },
    identity: { lineage: "", legacy: "", level: 1 },
    notes: ""
  };
  // Preserve values already supplied by the creation workflow while filling
  // missing base fields. New prototype tokens start linked to their Actor.
  const system = foundry.utils.mergeObject(
    foundry.utils.deepClone(defaults),
    actor.system ?? {},
    { inplace: true, overwrite: true, recursive: true }
  );
  actor.updateSource({
    system,
    "prototypeToken.actorLink": true
  });
});
