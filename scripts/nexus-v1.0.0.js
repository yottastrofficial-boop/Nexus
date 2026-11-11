import { NexusActorSheet } from "./sheets/actor-sheet-v1.0.0.js";

Hooks.once("init", () => {
  console.log("NEXUS | Inicializando sistema 1.0.0.3");

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(foundry.documents.Actor, "nexus", NexusActorSheet, {
    types: ["player-character", "npc", "character"],
    makeDefault: true,
    label: "NEXUS — Ficha Modular"
  });
});

Hooks.once("ready", () => {
  console.log("NEXUS | Sistema 1.0.0.3 carregado. Ficha Canvas habilitada.");
});

const NEXUS_ACTOR_TYPES = ["player-character", "npc", "character"];
const DEFAULT_TOKEN_IMAGE = "icons/svg/mystery-man.svg";

Hooks.on("preCreateActor", (actor) => {
  if (!NEXUS_ACTOR_TYPES.includes(actor.type)) return;

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
  const system = foundry.utils.mergeObject(
    foundry.utils.deepClone(defaults),
    actor.system ?? {},
    { inplace: true, overwrite: true, recursive: true }
  );

  // O Token de Protótipo é a origem usada pelo Foundry ao criar tokens na cena.
  // Mantém imagens já configuradas e usa o retrato do Actor como fallback.
  const prototypeToken = foundry.utils.mergeObject(
    {
      actorLink: true,
      texture: { src: actor.img || DEFAULT_TOKEN_IMAGE }
    },
    actor.prototypeToken?.toObject?.() ?? actor.prototypeToken ?? {},
    { inplace: false, overwrite: true, recursive: true }
  );
  prototypeToken.actorLink = true;
  prototypeToken.texture ??= {};
  if (!prototypeToken.texture.src) prototypeToken.texture.src = actor.img || DEFAULT_TOKEN_IMAGE;

  actor.updateSource({ system, prototypeToken });
});

// Tokens criados a partir de Actors NEXUS permanecem vinculados por padrão.
// A opção explícita actorLink=false continua disponível para tokens independentes.
Hooks.on("preCreateToken", (token, data) => {
  if (data?.actorLink === false) return;

  const actor = token.actor ?? game.actors?.get(token.actorId ?? data?.actorId);
  if (!actor || !NEXUS_ACTOR_TYPES.includes(actor.type)) return;

  const prototypeImage = actor.prototypeToken?.texture?.src
    || actor.prototypeToken?.img
    || actor.img
    || DEFAULT_TOKEN_IMAGE;
  const currentImage = token.texture?.src ?? data?.texture?.src;
  const changes = { actorLink: true };

  if (!currentImage || currentImage === DEFAULT_TOKEN_IMAGE) {
    changes.texture = { src: prototypeImage };
  }
  token.updateSource(changes);
});
