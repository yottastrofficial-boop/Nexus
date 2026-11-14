import { findPropertyPickerNode } from "../core/property-catalog.js";

function createButton(label, className, attributes = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  for (const [key, value] of Object.entries(attributes)) button.dataset[key] = String(value);
  return button;
}

function appendPropertyOption(container, entry, label = entry.label, rollAlias = null) {
  const button = createButton("", "nexus-property-option", { propertyPathOption: entry.path });
  button.setAttribute("role", "option");
  const title = document.createElement("strong");
  title.textContent = label;
  const code = document.createElement("code");
  code.textContent = entry.path;
  button.append(title, code);
  if (rollAlias) {
    button.dataset.rollToken = "@" + rollAlias.display;
    button.dataset.rollAliasOption = "true";
    code.textContent = "@" + rollAlias.display + " → " + entry.path;
  }
  container.append(button);
}

export function renderPropertyPicker(list, catalog, { categoryPath = "", query = "", formulaMode = false } = {}) {
  if (!list || !catalog) return;
  const fragment = document.createDocumentFragment();
  const header = document.createElement("div");
  header.className = "nexus-property-options-toolbar";

  const title = document.createElement("strong");
  const currentNode = findPropertyPickerNode(catalog, categoryPath);
  title.textContent = categoryPath ? currentNode?.label ?? "Propriedades" : "Propriedades disponíveis";
  if (categoryPath) {
    const back = createButton("‹", "nexus-property-back", { propertyBack: "" });
    back.setAttribute("aria-label", "Voltar à categoria anterior");
    back.title = "Voltar";
    header.append(back);
  }
  header.append(title);
  fragment.append(header);

  const content = document.createElement("div");
  content.className = "nexus-property-options-content";

  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase("pt-BR");
  if (normalizedQuery) {
    const matches = catalog.entries.filter(entry =>
      entry.label.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      || entry.path.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
    );
    for (const entry of matches.slice(0, 100)) appendPropertyOption(content, entry);
    if (formulaMode) {
      const aliases = catalog.rollAliases.filter(entry =>
        (entry.label + " " + entry.display + " " + entry.target).toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      );
      if (aliases.length) {
        const heading = document.createElement("div");
        heading.className = "nexus-property-options-heading";
        heading.textContent = "Atalhos de rolagem";
        content.append(heading);
        for (const alias of aliases.slice(0, 30)) {
          appendPropertyOption(content, { path: alias.target, label: alias.label }, alias.label, alias);
        }
      }
    }
    if (!content.childElementCount) {
      const empty = document.createElement("div");
      empty.className = "nexus-property-options-empty";
      empty.textContent = "Nenhuma propriedade encontrada.";
      content.append(empty);
    }
  } else {
    const node = findPropertyPickerNode(catalog, categoryPath);
    const children = node ? [...node.children.values()] : [];
    if (categoryPath && node?.entry) {
      appendPropertyOption(content, node.entry, "Usar " + node.label);
    }
    children.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    for (const child of children) {
      if (child.children.size) {
        const category = createButton("", "nexus-property-category", { propertyCategory: child.path });
        const heading = document.createElement("strong");
        heading.textContent = child.label;
        const description = document.createElement("small");
        description.textContent = child.path;
        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";
        category.append(heading, description, arrow);
        content.append(category);
        if (child.entry) appendPropertyOption(content, child.entry, child.label + " · valor");
      } else if (child.entry) {
        appendPropertyOption(content, child.entry);
      }
    }
    if (formulaMode && catalog.rollAliases.length) {
      const heading = document.createElement("div");
      heading.className = "nexus-property-options-heading";
      heading.textContent = "Atalhos de rolagem";
      content.append(heading);
      for (const alias of catalog.rollAliases.slice(0, 30)) {
        appendPropertyOption(content, { path: alias.target, label: alias.label }, alias.label, alias);
      }
    }
    if (!content.childElementCount) {
      const empty = document.createElement("div");
      empty.className = "nexus-property-options-empty";
      empty.textContent = "Nenhuma propriedade nesta categoria.";
      content.append(empty);
    }
  }

  fragment.append(content);
  list.replaceChildren(fragment);
  list.dataset.categoryPath = categoryPath;
  list.dataset.empty = content.querySelector(".nexus-property-options-empty") ? "true" : "false";
}
