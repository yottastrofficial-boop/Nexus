import {
  DESIGN_PROFILE_PALETTE_KEYS,
  DESIGN_PROFILE_SCHEMA_VERSION,
  normalizeDesignProfile,
  getDesignProfileDiagnostics
} from "../core/design-profile.js";

const PALETTE_LABELS = Object.freeze({
  panel: "Painel", surface: "Superfície", input: "Campo", border: "Borda",
  text: "Texto", muted: "Texto secundário", hover: "Realce de passagem",
  scroll: "Rolagem", windowHeader: "Cabeçalho", windowContent: "Conteúdo",
  menu: "Menu", placeholder: "Placeholder", resourceButton: "Botão de recurso",
  canvas: "Canvas", card: "Cartão", accent: "Acento", highlight: "Destaque", button: "Botão"
});

const PRESET_LABELS = Object.freeze({
  "nexus-dark": "NEXUS Escuro", midnight: "Meia-noite", light: "Claro",
  steam: "Steam", linux: "Linux", medieval: "Medieval", "pixel-art": "Pixel Art"
});
const DENSITY_LABELS = Object.freeze({ compact: "Compacta", comfortable: "Confortável", spacious: "Espaçosa" });
const RADIUS_LABELS = Object.freeze({ sharp: "Angular", soft: "Suave", rounded: "Arredondada" });

/** Builds a safe, presentation-only model. Future schemas are never normalized down or applied. */
export function getLibraryDesignProfilePreviewModel(raw) {
  const entry = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const source = entry.profile && typeof entry.profile === "object" ? entry.profile : entry;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const version = Number(source.schemaVersion ?? 1);
  if (!Number.isInteger(version) || version < 1) {
    return {
      supported: false,
      schemaVersion: Number.isFinite(version) ? version : null,
      message: "A versão do schema deste perfil é inválida. A prévia e a aplicação foram desativadas para preservar seus dados."
    };
  }
  if (version > DESIGN_PROFILE_SCHEMA_VERSION) {
    return {
      supported: false,
      schemaVersion: version,
      message: "Este perfil foi criado por uma versão mais recente do NEXUS. A prévia e a aplicação foram desativadas para preservar seus dados."
    };
  }
  const profile = normalizeDesignProfile(source);
  const diagnostics = getDesignProfileDiagnostics(profile);
  return Object.freeze({
    supported: true,
    schemaVersion: DESIGN_PROFILE_SCHEMA_VERSION,
    id: profile.id,
    name: profile.name,
    preset: profile.preset,
    presetLabel: PRESET_LABELS[profile.preset] ?? profile.preset,
    palette: Object.freeze(DESIGN_PROFILE_PALETTE_KEYS.map(key => Object.freeze({
      key, label: PALETTE_LABELS[key] ?? key, value: profile.palette[key]
    }))),
    typography: Object.freeze({ ...profile.typography }),
    layout: Object.freeze({
      ...profile.layout,
      densityLabel: DENSITY_LABELS[profile.layout.density],
      radiusLabel: RADIUS_LABELS[profile.layout.radius]
    }),
    accessibility: Object.freeze({ ...profile.accessibility }),
    diagnostics: Object.freeze({
      checks: Object.freeze(diagnostics.checks.map(check => Object.freeze({ ...check }))),
      warnings: Object.freeze([...diagnostics.warnings])
    })
  });
}

/** Explicit scope-aware adapter shared by the standalone and embedded Library inspectors. */
export function createLibraryThemeApplicationAdapter({
  getDesign = () => globalThis.game?.nexus?.design,
  confirm = options => {
    const handler = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
    return typeof handler === "function" ? handler(options) : null;
  }
} = {}) {
  const canApplyTheme = (resource, resolved, scope) => {
    if (!["world", "user"].includes(scope) || resource?.kind !== "theme" ||
        resolved?.kind !== "design-profile" || !resolved?.profile) return false;
    const version = Number(resolved.profile.schemaVersion ?? 1);
    if (!Number.isInteger(version) || version < 1 || version > DESIGN_PROFILE_SCHEMA_VERSION) return false;
    const design = getDesign();
    return typeof design?.canEditScope === "function" && design.canEditScope(scope) === true;
  };

  const onApplyTheme = async (resource, resolved, scope) => {
    if (!canApplyTheme(resource, resolved, scope)) {
      throw new Error("Este perfil não pode ser aplicado neste escopo ou nesta versão do NEXUS.");
    }
    const design = getDesign();
    if (scope === "world") {
      if (typeof confirm !== "function") throw new Error("O diálogo de confirmação do Foundry não está disponível.");
      const accepted = await confirm({
        window: { title: "Alterar aparência da campanha" },
        content: "<p>Esta alteração será compartilhada com os jogadores que seguem a aparência da campanha. Deseja continuar?</p>",
        yes: { label: "Aplicar à campanha" },
        no: { label: "Cancelar" },
        rejectClose: false
      });
      if (accepted === null || accepted === undefined) throw new Error("O diálogo de confirmação do Foundry não está disponível.");
      if (!accepted) return false;
    }
    await design.saveProfile(resolved.profile, scope);
    return true;
  };

  return Object.freeze({ canApplyTheme, onApplyTheme });
}
