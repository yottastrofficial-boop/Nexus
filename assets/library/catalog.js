/** Catálogo inicial de componentes visuais neutros e reutilizáveis. */
export const NEXUS_LIBRARY_CATALOG = {
  categories: [
    { id: "core", label: "Padrão NEXUS", icon: "fa-solid fa-cube" }
  ],
  assets: [
    {
      key: "core-health-bar",
      type: "sheet-resource",
      label: "Barra de recurso",
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
        h: 60
      },
      tags: ["recurso", "barra", "indicador"],
      keywords: "recurso barra indicador progresso valor atual máximo"
    }
  ],
  themes: []
};
