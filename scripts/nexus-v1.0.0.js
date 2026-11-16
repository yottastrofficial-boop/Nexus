import { NexusActorSheet } from "./sheets/actor-sheet-v1.0.0.js";
import { NEXUS_SKILLS } from "./core/skills.js";

Hooks.once("init", () => {
  game.settings.register("nexus","interactionLibrary",{
    name:"Biblioteca de fluxos",
    scope:"client",
    config:false,
    type:Array,
    default:[]
  });
  console.log("NEXUS | Inicializando sistema 1.0.0.47");

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(foundry.documents.Actor, "nexus", NexusActorSheet, {
    types: ["player-character", "npc", "character"],
    makeDefault: true,
    label: "NEXUS — Ficha Modular"
  });
});

Hooks.once("ready", () => {
  console.log("NEXUS | Sistema 1.0.0.47 carregado. Ficha Canvas habilitada.");
});

const NEXUS_ACTOR_TYPES = ["player-character", "npc", "character"];
const DEFAULT_TOKEN_IMAGE = "icons/svg/mystery-man.svg";

Hooks.on("preCreateActor", (actor) => {
  if (!NEXUS_ACTOR_TYPES.includes(actor.type)) return;

  const defaults = {
    resources: {
      pv: { value: 2, max: 2, temporary: 0 },
      pm: { value: 2, max: 2, temporary: 0 },
      pe: { value: 2, max: 2, temporary: 0 }
    },
    attributes: { for: 0, des: 0, sab: 0, int: 0, car: 0, von: 0 },
    skills: Object.fromEntries(NEXUS_SKILLS.map(skill => [skill.key, { proficient: false }])),
    combat: { defenseModifier: 0, movement: 0 },
    identity: { concept: "", ancestry: "", lineage: "", legacy: "", talent: "", class: "", archetype: "", function: "", level: 1 },
    personality: { appearance: "", traits: "", flaws: "", bonds: "", ideals: "", motivation: "", alignment: { order: "", morality: "" } },
    recovery: { spent: 0 },
    encumbrance: { current: 0 },
    conditions: [],
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

// O retrato do Actor e a textura do Token são propriedades distintas no Foundry.
// Ao trocar o retrato, atualiza o Token de Protótipo apenas quando ele ainda usa
// a imagem herdada do retrato anterior (ou o fallback); tokens personalizados são preservados.
Hooks.on("preUpdateActor", (actor, changes) => {
  if (!NEXUS_ACTOR_TYPES.includes(actor.type)) return;
  const nextPortrait = changes.img;
  if (typeof nextPortrait !== "string" || !nextPortrait.trim()) return;
  const currentTokenImage = actor.prototypeToken?.texture?.src || actor.prototypeToken?.img || "";
  const previousPortrait = actor.img || "";
  if (!currentTokenImage || currentTokenImage === previousPortrait || currentTokenImage === DEFAULT_TOKEN_IMAGE) {
    changes["prototypeToken.texture.src"] = nextPortrait;
  }
});
// Tokens criados a partir de Actors NEXUS permanecem vinculados por padrão.
// Depois da criação, o usuário ainda pode desvincular um Token nas configurações.
Hooks.on("preCreateToken", (token, data) => {
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
