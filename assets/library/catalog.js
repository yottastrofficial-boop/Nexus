/** Catálogo inicial enxuto do NEXUS. A biblioteca mantém apenas o componente de barra de vida aprovado. */
export const NEXUS_LIBRARY_CATALOG = {
  categories: [
    { id: "core", label: "Padrão NEXUS", icon: "fa-solid fa-cube" }
  ],
  assets: [
    {
      key: "core-health-bar",
      type: "sheet-resource",
      label: "Indicador – Barra",
      category: "core",
      preview: "bar",
      template: {
        sheetCode: "PV",
        sheetContent1: "PV",
        sheetContent2: "❤️",
        sheetColor: "#d94b4b",
        sheetTrackColor: "#080d14",
        sheetOrientation: "horizontal",
        currentPath: "resources.pv.value",
        maxPath: "resources.pv.max",
        w: 220,
        h: 58
      },
      keywords: "pontos de vida PV saúde recurso indicador barra"
    },
    {
      key: "core-skill-proficiency",
      type: "sheet-proficiency",
      label: "Marcador de proficiência",
      category: "core",
      preview: "proficiency",
      template: {
        actionType: "proficiency",
        actionPath: "skills.athletics.proficientLevel",
        sheetVariant: "proficiency",
        customLabel: "Proficiência",
        showLabel: false,
        w: 44,
        h: 44
      },
      keywords: "perícia habilidade proficiência domínio marcador"
    }
  ],
  themes: []
};
