import { createNexusServiceRegistry } from "./core/service-registry.js";
import { NexusActorSheet } from "./sheets/actor-sheet-v1.0.0.js";
import { NEXUS_SKILLS } from "./core/skills.js";
import { createMediaFormatRegistry } from "./core/media-format-registry.js";
import { createLogicRegistry } from "./core/logic-registry.js";
import { createNexusLogicSchemas } from "./core/logic-schemas.js";
import { createLogicRuntime } from "./core/logic-runtime.js";
import { installFoundryLogicIntegration } from "./core/foundry-logic-integration.js";
import { loadLogicLibrary, saveLogicAsset, deleteLogicAsset } from "./core/logic-library.js";
import { createMediaCapabilityService, createMediaProcessingPipeline, createBrowserMediaAdapter, createWorkerMediaAdapter, installNexusMediaWorkerRuntime } from "./core/media-service.js";
import { createFoundryMediaStorageAdapter, createMediaStorageRouter, createIndexedDbMediaCache, createMediaCacheKey } from "./core/media-storage.js";
import { createResourceLifecycleManager } from "./core/resource-lifecycle.js";
import { createFoundryDocumentBridge } from "./core/foundry-document-bridge.js";
import { createDefaultLibraryResourceRegistry } from "./core/library-resource-registry.js";
import { createLibraryApplicationClass } from "./library/library-application.js";
import { normalizeLibraryPreferences } from "./core/library-preferences.js";
import { createLibraryBackupService } from "./library/library-backup-service.js";
import { createLibraryTransferRegistry } from "./core/library-transfer-registry.js";
import { NEXUS_COMPONENTS } from "./core/component-types.js";
import { THEME_PALETTES, THEME_TOKENS, applyThemeTokens } from "./core/theme.js";
import { installNexusDesignSystem } from "./core/design-system.js";
import { createDesignStudioApplicationClass } from "./apps/design-studio.js";
import { createDesignLibraryService } from "./core/design-library.js";
import { getInteractionLibrary } from "./core/interactions.js";
import { NEXUS_LIBRARY_CATALOG } from "../assets/library/catalog.js";

Hooks.once("init", () => {
  // Registro próprio do NEXUS; adaptadores pesados serão carregados sob demanda.
  game.nexus ??= {};
  // Registro público de serviços: dependências compartilhadas por subsistemas,
  // módulos e futuras integrações, sem acoplamento à classe da ficha.
  game.nexus.services ??= createNexusServiceRegistry({ context: { systemId: "nexus", version: game.system.version } });
  const registerService = (name, factory, options = {}) => {
    if (!game.nexus.services.has(name)) game.nexus.services.register(name, factory, options);
    return game.nexus.services.resolveSync(name);
  };
  // O Design System aplica o tema efetivo à interface NEXUS e às áreas nativas suportadas do Foundry.
  game.nexus.design = registerService("design", () => installNexusDesignSystem({
    gameRef: game,
    documentRef: document,
    hooks: Hooks,
    themeTokens: THEME_TOKENS,
    applyThemeTokens
  }));
  game.nexus.design.library = registerService("design.library", ({ design }) =>
    createDesignLibraryService({ getUser: () => game.user, design }), { dependencies: ["design"] });
  const DesignStudioApplication = registerService("design.studioClass", ({ design, "design.library": library }) =>
    createDesignStudioApplicationClass({
      ApplicationV2: foundry.applications.api.ApplicationV2,
      HandlebarsApplicationMixin: foundry.applications.api.HandlebarsApplicationMixin,
      design,
      library
    }), { dependencies: ["design", "design.library"] });
  // Settings and direct launch use the same ApplicationV2 class and singleton reference.
  const DesignStudioMenuApplication = DesignStudioApplication;
  game.nexus.design.Studio = DesignStudioApplication;
  game.nexus.design.StudioMenu = DesignStudioMenuApplication;
  game.nexus.design.registerStudio(DesignStudioMenuApplication);
  game.nexus.design.openStudio = () => {
    let application = game.nexus.design.application;
    if (!application || application.state === foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
      application = new DesignStudioApplication();
      game.nexus.design.application = application;
    }
    if (application.rendered) {
      application.bringToFront?.();
      return Promise.resolve(application);
    }
    return Promise.resolve(application.render({ force: true })).then(() => application);
  };
  // Gerencia objetos transitórios em RAM, sem duplicar o cache IndexedDB.
  game.nexus.resources = registerService("resources", () => createResourceLifecycleManager());
  // Referências leves a documentos Foundry; nenhuma listagem é carregada no init.
  game.nexus.documents = registerService("documents", () => createFoundryDocumentBridge({ gameRef: game, fromUuidRef: globalThis.fromUuid }));
  // Um catálogo único agrega recursos NEXUS, lógica e documentos Foundry por provedores.
  // Os provedores retornam metadados leves; o conteúdo completo é resolvido sob demanda.
  game.nexus.library ??= {};
  game.nexus.library.designProfiles ??= game.nexus.design.library;
  game.nexus.library.registry = registerService("library.registry", ({ documents }) => createDefaultLibraryResourceRegistry({
    getUser: () => game.user,
    getWorldFlows: () => {
      try { return game.settings.get("nexus", "interactionLibrary") ?? []; }
      catch { return []; }
    },
    documentBridge: documents,
    catalog: NEXUS_LIBRARY_CATALOG
  }), { dependencies: ["documents"] });
  game.nexus.library.list = options => game.nexus.library.registry.list(options);
  game.nexus.library.resolve = (reference, resource) => game.nexus.library.registry.resolve(reference, resource);
  game.nexus.library.getActions = (reference, resource) => game.nexus.library.registry.getActions(reference, resource);
  game.nexus.library.executeAction = (actionId, reference, resource, params) =>
    game.nexus.library.registry.executeAction(actionId, reference, resource, params);
  game.nexus.library.registerProvider = provider => game.nexus.library.registry.register(provider);
  game.nexus.library.getProviders = () => game.nexus.library.registry.getProviders();
  game.nexus.library.transfers = registerService("library.transfers", () => createLibraryTransferRegistry());
  game.nexus.library.registerSourceAdapter = adapter => game.nexus.library.transfers.registerSource(adapter);
  game.nexus.library.registerDestinationAdapter = adapter => game.nexus.library.transfers.registerDestination(adapter);
  game.nexus.library.prepareTransfer = options => game.nexus.library.transfers.prepare(options);
  game.nexus.library.commitTransfer = (planId, context) => game.nexus.library.transfers.commit(planId, context);
  game.nexus.library.discardTransfer = planId => game.nexus.library.transfers.discard(planId);
  game.nexus.library.getTransferAdapters = () => ({
    sources: game.nexus.library.transfers.listSources(),
    destinations: game.nexus.library.transfers.listDestinations()
  });
  game.nexus.library.backup = registerService("library.backup", () => createLibraryBackupService({
    getUser: () => game.user,
    getCatalog: () => NEXUS_LIBRARY_CATALOG,
    getThemePalettes: () => THEME_PALETTES,
    getWorldFlows: () => getInteractionLibrary(),
    setWorldFlows: entries => game.settings.set("nexus", "interactionLibrary", entries),
    getComponentTypes: () => Object.keys(NEXUS_COMPONENTS)
  }));
  // API pública de importação/exportação da Biblioteca. O serviço valida o pacote
  // e separa a prévia do commit para evitar sobrescritas silenciosas.
  game.nexus.library.exportBackup = () => game.nexus.library.backup.exportCode();
  game.nexus.library.prepareBackupImport = (source, options) =>
    game.nexus.library.backup.prepareImport(source, options);
  game.nexus.library.commitBackupImport = plan =>
    game.nexus.library.backup.commitImport(plan);
  game.nexus.library.importBackup = (source, options) =>
    game.nexus.library.backup.importCode(source, options);
  const LibraryApplication = registerService("library.applicationClass", ({ "library.registry": registry }) =>
    createLibraryApplicationClass({
      ApplicationV2: foundry.applications.api.ApplicationV2,
      HandlebarsApplicationMixin: foundry.applications.api.HandlebarsApplicationMixin,
      registry,
      getPreferences: () => normalizeLibraryPreferences(game.user?.getFlag?.("nexus", "libraryPreferences")),
      savePreferences: preferences => {
        if (typeof game.user?.setFlag !== "function") throw new Error("Não foi possível salvar as preferências da Biblioteca.");
        return game.user.setFlag("nexus", "libraryPreferences", preferences);
      }
    }), { dependencies: ["library.registry"] });
  game.nexus.library.Application = LibraryApplication;
  const LibraryMenuApplication = class extends LibraryApplication {
    constructor(options = {}) {
      const current = game.nexus.library.application;
      if (current) {
        current.setContext({});
        return current;
      }
      super(options);
      this.setContext({});
      game.nexus.library.application = this;
    }
  };
  game.nexus.library.MenuApplication = LibraryMenuApplication;
  game.nexus.library.open = (context = {}) => {
    const current = game.nexus.library.application;
    if (current?.rendered) {
      current.setContext(context);
      const rendered = current.render({ force: true });
      current.bringToTop?.();
      return Promise.resolve(rendered).then(() => current);
    }
    const application = new LibraryApplication().setContext(context);
    game.nexus.library.application = application;
    return Promise.resolve(application.render({ force: true })).then(() => application);
  };
  if (typeof game.settings?.registerMenu === "function" && !game.settings.menus?.has?.("nexus.universalLibrary")) {
    game.settings.registerMenu("nexus", "universalLibrary", {
      name: "Biblioteca Universal",
      label: "Abrir Biblioteca",
      hint: "Consulte, organize e reutilize os recursos disponíveis no NEXUS.",
      icon: "fa-solid fa-book-open",
      type: LibraryMenuApplication,
      restricted: false
    });
  }
  game.nexus.media ??= {};
  game.nexus.media.formats = registerService("media.formats", () => createMediaFormatRegistry());
  game.nexus.media.capabilities = registerService("media.capabilities", ({ "media.formats": registry }) =>
    createMediaCapabilityService({ registry }), { dependencies: ["media.formats"] });
  game.nexus.media.pipeline = registerService("media.pipeline", ({ "media.capabilities": capabilityService, resources }) =>
    createMediaProcessingPipeline({
      capabilityService,
      resourceManager: resources,
      adapters: [createBrowserMediaAdapter(capabilityService)]
    }), { dependencies: ["media.capabilities", "resources"] });
  game.nexus.media.storage = registerService("media.storage", () => createMediaStorageRouter([
    createFoundryMediaStorageAdapter({
      FilePicker: foundry.applications.apps.FilePicker,
      extensions: CONST.UPLOADABLE_FILE_EXTENSIONS
    })
  ]));
  game.nexus.media.createWorkerAdapter = createWorkerMediaAdapter;
  game.nexus.media.installWorkerRuntime = installNexusMediaWorkerRuntime;
  game.nexus.media.createCacheKey = createMediaCacheKey;
  if (globalThis.indexedDB?.open) {
    try { game.nexus.media.cache = createIndexedDbMediaCache(); }
    catch (error) { console.warn("NEXUS | Cache local de mídia indisponível.", error); }
  }

  game.nexus.logic ??= {};
  game.nexus.logic.registry = registerService("logic.registry", () => createLogicRegistry({ schemas: createNexusLogicSchemas() }));
  game.nexus.logic.runtime = registerService("logic.runtime", ({ "logic.registry": registry }) => createLogicRuntime({ registry }), { dependencies: ["logic.registry"] });
  if (!game.nexus.services.has("logic.foundryIntegration")) game.nexus.services.register("logic.foundryIntegration", ({ "logic.runtime": runtime }) => installFoundryLogicIntegration({ hooks: Hooks, runtime, gameRef: game, constRef: CONST }), { dependencies: ["logic.runtime"] });
  game.nexus.logic.setPermissionResolver = resolver => game.nexus.logic.runtime.setPermissionResolver(resolver);
  game.nexus.logic.registerAction = descriptor => game.nexus.logic.runtime.registerAction(descriptor);
  game.nexus.logic.getActionDefinitions = () => game.nexus.logic.runtime.getActionDefinitions();
  game.nexus.logic.getActionDefinition = type => game.nexus.logic.runtime.getActionDefinition(type);
  game.nexus.logic.validateActionConfig = (type, config) => game.nexus.logic.runtime.validateActionConfig(type, config);
  game.nexus.logic.registerFunction = descriptor => game.nexus.logic.runtime.registerFunction(descriptor);
  game.nexus.logic.runFlow = (flow, context) => game.nexus.logic.runtime.runFlow(flow, context);
  game.nexus.logic.simulateFlow = (flow, context) => game.nexus.logic.runtime.simulateFlow(flow, context);
  game.nexus.logic.dispatch = (eventName, context) => game.nexus.logic.runtime.dispatch(eventName, context);
  game.nexus.logic.getExecutors = () => ({
    actions: game.nexus.logic.runtime.actionTypes,
    actionDefinitions: game.nexus.logic.runtime.getActionDefinitions(),
    functions: game.nexus.logic.runtime.functionIds
  });
  game.nexus.logic.loadLibrary = () => loadLogicLibrary(game.user, game.nexus.logic.registry);
  game.nexus.logic.save = async asset => {
    const checked = game.nexus.logic.registry.validateAsset(asset);
    if (!checked.valid) throw new Error(checked.errors.join(" "));
    const saved = await saveLogicAsset(game.user, checked.asset);
    game.nexus.logic.registry.register(saved, { replace: true });
    return saved;
  };
  game.nexus.logic.remove = id => deleteLogicAsset(game.user, game.nexus.logic.registry, id);

  game.settings.register("nexus","interactionLibrary",{
    name:"Biblioteca de fluxos",
    scope:"client",
    config:false,
    type:Array,
    default:[]
  });
  console.log(`NEXUS | Inicializando sistema ${game.system.version}`);

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(foundry.documents.Actor, "nexus", NexusActorSheet, {
    types: ["player-character", "npc", "character"],
    makeDefault: true,
    label: "NEXUS — Ficha Modular"
  });
});

Hooks.once("ready", () => {
  try {
    const report = game.nexus?.logic?.loadLibrary?.();
    if (report?.errors?.length) console.warn("NEXUS | Alguns ativos da Lógica não puderam ser carregados.", report.errors);
    console.info("NEXUS | Ativos lógicos carregados:", report?.loaded?.length ?? 0);
  } catch (error) {
    console.error("NEXUS | Falha ao carregar a Biblioteca de Lógica.", error);
  }
  try {
    game.nexus.logic.foundryIntegration = game.nexus.services.resolveSync("logic.foundryIntegration");
    console.info("NEXUS | Eventos do Foundry conectados à Lógica:", game.nexus.logic.foundryIntegration.bridge.hookCount);
  } catch (error) {
    console.error("NEXUS | Falha ao conectar eventos do Foundry à Lógica.", error);
  }
  console.log(`NEXUS | Sistema ${game.system.version} carregado. Ficha Canvas habilitada.`);
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
