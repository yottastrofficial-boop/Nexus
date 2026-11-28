/**
 * NEXUS Actor document lifecycle integration.
 *
 * Owns NEXUS defaults and prototype-token synchronization for Actor/Token
 * documents. Dependencies are injected so the behavior can be tested without
 * booting Foundry, and the returned disposer removes all registered hooks.
 */
export function installNexusActorDocumentLifecycle({
  hooks,
  foundryRef,
  gameRef,
  actorTypes = ["player-character", "npc", "character"],
  skills = [],
  defaultTokenImage = "icons/svg/mystery-man.svg"
} = {}) {
  if (!hooks?.on || !foundryRef?.utils || !gameRef) {
    throw new TypeError("NEXUS Actor lifecycle requires hooks, Foundry utilities and game.");
  }

  const registered = [];
  let disposed = false;
  const register = (eventName, callback) => {
    const hookId = hooks.on(eventName, callback);
    registered.push({ eventName, hookId });
  };

  register("preCreateActor", actor => {
    if (!actorTypes.includes(actor.type)) return;

    const defaults = {
      resources: {
        pv: { value: 2, max: 2, temporary: 0 },
        pm: { value: 2, max: 2, temporary: 0 },
        pe: { value: 2, max: 2, temporary: 0 }
      },
      attributes: { for: 0, des: 0, sab: 0, int: 0, car: 0, von: 0 },
      skills: Object.fromEntries(skills.map(skill => [skill.key, { proficient: false }])),
      combat: { defenseModifier: 0, movement: 0 },
      identity: { concept: "", ancestry: "", lineage: "", legacy: "", talent: "", class: "", archetype: "", function: "", level: 1 },
      personality: { appearance: "", traits: "", flaws: "", bonds: "", ideals: "", motivation: "", alignment: { order: "", morality: "" } },
      recovery: { spent: 0 },
      encumbrance: { current: 0 },
      conditions: [],
      notes: ""
    };
    const system = foundryRef.utils.mergeObject(
      foundryRef.utils.deepClone(defaults),
      actor.system ?? {},
      { inplace: true, overwrite: true, recursive: true }
    );

    // Foundry uses the prototype token texture when creating scene tokens.
    // Preserve a custom texture and use the Actor portrait only as fallback.
    const prototypeToken = foundryRef.utils.mergeObject(
      {
        actorLink: true,
        texture: { src: actor.img || defaultTokenImage }
      },
      actor.prototypeToken?.toObject?.() ?? actor.prototypeToken ?? {},
      { inplace: false, overwrite: true, recursive: true }
    );
    prototypeToken.actorLink = true;
    prototypeToken.texture ??= {};
    if (!prototypeToken.texture.src) prototypeToken.texture.src = actor.img || defaultTokenImage;

    actor.updateSource({ system, prototypeToken });
  });

  register("preUpdateActor", (actor, changes) => {
    if (!actorTypes.includes(actor.type)) return;
    const nextPortrait = changes.img;
    if (typeof nextPortrait !== "string" || !nextPortrait.trim()) return;
    const currentTokenImage = actor.prototypeToken?.texture?.src || actor.prototypeToken?.img || "";
    const previousPortrait = actor.img || "";
    if (!currentTokenImage || currentTokenImage === previousPortrait || currentTokenImage === defaultTokenImage) {
      changes["prototypeToken.texture.src"] = nextPortrait;
    }
  });

  register("preCreateToken", (token, data) => {
    const actor = token.actor ?? gameRef.actors?.get(token.actorId ?? data?.actorId);
    if (!actor || !actorTypes.includes(actor.type)) return;

    const prototypeImage = actor.prototypeToken?.texture?.src
      || actor.prototypeToken?.img
      || actor.img
      || defaultTokenImage;
    const currentImage = token.texture?.src ?? data?.texture?.src;
    const changes = { actorLink: true };
    if (!currentImage || currentImage === defaultTokenImage) changes.texture = { src: prototypeImage };
    token.updateSource(changes);
  });

  return () => {
    if (disposed) return;
    disposed = true;
    for (const { eventName, hookId } of registered) {
      if (hookId !== undefined && hookId !== null) hooks.off?.(eventName, hookId);
    }
    registered.length = 0;
  };
}
