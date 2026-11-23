/** Catálogo inicial de componentes visuais neutros e reutilizáveis. */
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
        sheetCode: "",
        sheetContent1: "",
        sheetContent2: "",
        sheetColor: "#8994a3",
        sheetTrackColor: "#293443",
        sheetOrientation: "horizontal",
        currentPath: "",
        maxPath: "",
        w: 220,
        h: 58
      },
      tags: ["recurso", "barra", "indicador"],
      keywords: "recurso indicador barra progresso valor atual máximo"
    }
  ],
  themes: []
};
