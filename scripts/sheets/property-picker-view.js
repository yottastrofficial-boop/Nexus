import { findPropertyPickerNode } from "../core/property-catalog.js";

function createButton(label, className, attributes = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  for (const [key, value] of Object.entries(attributes)) button.dataset[key] = String(value);
  return button;
}

function formatPropertyValue(value) {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") return value.length > 96 ? value.slice(0, 93) + "…" : (value || "—");
  if (Array.isArray(value)) return value.length ? "Lista · " + value.length + " itens" : "Lista vazia";
  return "Objeto";
}

function appendPropertyOption(container, entry, label = entry.label, rollAlias = null, getValue = null) {
  const button = createButton("", "nexus-property-option", { propertyPathOption: entry.path });
  button.setAttribute("role", "option");
  const title = document.createElement("strong");
  title.className = "nexus-property-option-name";
  title.textContent = label;
  title.title = label;
  const rawValue = getValue?.(entry.path);
  const value = document.createElement("small");
  value.className = "nexus-property-option-value";
  value.textContent = "Valor atual: " + formatPropertyValue(rawValue);
  value.title = rawValue === undefined || rawValue === null ? "Sem valor definido" : String(rawValue);
  const code = document.createElement("code");
  code.className = "nexus-property-option-path";
  code.textContent = entry.path;
  code.title = entry.path;
  button.setAttribute("aria-label", `${label}; ${entry.path}; valor atual ${formatPropertyValue(rawValue)}`);
  button.append(title, value, code);
  if (rollAlias) {
    button.dataset.rollToken = "@" + rollAlias.display;
    button.dataset.rollAliasOption = "true";
    code.textContent = "@" + rollAlias.display + " → " + entry.path;
  }
  container.append(button);
}

export function renderPropertyPicker(list, catalog, { categoryPath = "", query = "", formulaMode = false, getValue = null } = {}) {
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
      [entry.label, entry.searchLabel, entry.path].some(value => String(value ?? "").toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    );
    for (const entry of matches.slice(0, 100)) appendPropertyOption(content, entry, entry.searchLabel ?? entry.label, null, getValue);
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
          appendPropertyOption(content, { path: alias.target, label: alias.label }, alias.label, alias, getValue);
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
      appendPropertyOption(content, node.entry, "Usar " + node.label, null, getValue);
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
        if (child.entry) appendPropertyOption(content, child.entry, child.label + " · valor", null, getValue);
      } else if (child.entry) {
        appendPropertyOption(content, child.entry, child.entry.label, null, getValue);
      }
    }
    if (formulaMode && catalog.rollAliases.length) {
      const heading = document.createElement("div");
      heading.className = "nexus-property-options-heading";
      heading.textContent = "Atalhos de rolagem";
      content.append(heading);
      for (const alias of catalog.rollAliases.slice(0, 30)) {
        appendPropertyOption(content, { path: alias.target, label: alias.label }, alias.label, alias, getValue);
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
