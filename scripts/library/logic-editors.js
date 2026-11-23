const clone = value => structuredClone(value ?? {});
const make = (tag, className, value = "") => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== "") element.textContent = String(value);
  return element;
};
const JSON_FIELDS = new Set(["triggers", "conditions", "actions", "arguments"]);

export function buildLogicEditorPayload(type, basePayload = {}, draft = {}) {
  const payload = clone(basePayload);
  const value = key => String(draft[key] ?? "");
  const parseArray = key => {
    let parsed;
    try { parsed = JSON.parse(value(key) || "[]"); }
    catch { throw new Error(key + ": JSON inválido."); }
    if (!Array.isArray(parsed)) throw new Error(key + ": informe uma lista JSON.");
    return parsed;
  };
  if (type === "property") {
    const path = value("path").trim();
    if (!path) throw new Error("Informe o caminho da propriedade.");
    payload.path = path;
    payload.valueType = value("valueType") || "string";
    if (draft.hasDefault === true) {
      try { payload.defaultValue = JSON.parse(value("defaultValue")); }
      catch { throw new Error("Valor padrão precisa ser JSON válido (ex.: 0, false ou \"texto\")."); }
    } else delete payload.defaultValue;
  } else if (type === "rule") {
    const expression = value("expression").trim();
    if (!expression) throw new Error("Informe a expressão da regra.");
    payload.expression = expression;
    payload.resultType = value("resultType") || "boolean";
    delete payload.formula;
  } else if (type === "behavior") {
    const events = value("events").split(",").map(item => item.trim()).filter(Boolean);
    payload.events = events;
    const flowId = value("flowId").trim();
    if (flowId) payload.flowId = flowId;
    else delete payload.flowId;
    delete payload.event;
  } else if (type === "flow") {
    for (const key of ["triggers", "conditions", "actions"]) payload[key] = parseArray(key);
    payload.conditionJoin = value("conditionJoin") === "any" ? "any" : "all";
    payload.execution = { ...(isRecord(payload.execution) ? payload.execution : {}), onError: value("onError") === "continue" ? "continue" : "stop" };
  } else if (type === "function") {
    const functionId = value("functionId").trim();
    if (!functionId) throw new Error("Informe o identificador da função registrada.");
    payload.functionId = functionId;
    payload.signature = value("signature").trim();
    payload.returnType = value("returnType") || "any";
    payload.arguments = parseArray("arguments");
  } else {
    throw new Error("Não existe editor especializado para este tipo lógico.");
  }
  return payload;
}
const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function createLogicAssetEditor({ asset, runtime = null, onSave } = {}) {
  if (!asset || !["property", "rule", "behavior", "flow", "function"].includes(asset.type)) return null;
  if (typeof onSave !== "function") throw new TypeError("O editor lógico precisa de um callback de salvamento.");
  const payload = clone(asset.payload);
  const section = make("section", "nexus-library-logic-editor");
  const heading = make("h4", "", "Editor de " + ({
    property: "Propriedades", rule: "Regras", behavior: "Comportamentos", flow: "Fluxos", function: "Funções"
  }[asset.type]));
  const note = make("p", "nexus-library-logic-editor-note");
  const form = make("form", "nexus-library-logic-editor-form");
  const fields = {};
  const addInput = (key, labelText, value, inputType = "text") => {
    const label = make("label", "nexus-library-logic-field");
    label.append(make("span", "", labelText));
    const input = make("input", "");
    input.type = inputType;
    input.name = key;
    input.value = value == null ? "" : String(value);
    fields[key] = input;
    label.append(input);
    form.append(label);
  };
  const addSelect = (key, labelText, value, options) => {
    const label = make("label", "nexus-library-logic-field");
    label.append(make("span", "", labelText));
    const select = make("select", "");
    select.name = key;
    for (const option of options) {
      const node = make("option", "", option[1]);
      node.value = option[0];
      node.selected = option[0] === value;
      select.append(node);
    }
    fields[key] = select;
    label.append(select);
    form.append(label);
  };
  const addTextarea = (key, labelText, value, rows = 4) => {
    const label = make("label", "nexus-library-logic-field nexus-library-logic-field-wide");
    label.append(make("span", "", labelText));
    const textarea = make("textarea", "");
    textarea.name = key;
    textarea.rows = rows;
    textarea.spellcheck = false;
    textarea.value = typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2);
    fields[key] = textarea;
    label.append(textarea);
    form.append(label);
  };

  if (asset.type === "property") {
    note.textContent = "Defina o caminho e o tipo. Valores padrão são dados JSON, não código.";
    addInput("path", "Caminho da propriedade", payload.path ?? payload.key ?? "");
    addSelect("valueType", "Tipo do valor", payload.valueType ?? "string", [
      ["string", "Texto"], ["number", "Número"], ["boolean", "Verdadeiro/falso"],
      ["array", "Lista"], ["object", "Objeto"], ["formula", "Expressão"]
    ]);
    addInput("hasDefault", "Valor padrão (JSON; deixe vazio para remover)", hasOwn(payload, "defaultValue") ? JSON.stringify(payload.defaultValue) : "");
    fields.hasDefault = { checked: hasOwn(payload, "defaultValue") };
    fields.defaultValue = fields.hasDefaultInput = fields.hasDefault;
    const defaultField = form.lastElementChild;
    if (defaultField) {
      const input = defaultField.querySelector("input");
      if (input) { fields.defaultValue = input; fields.hasDefault = { get checked() { return input.value.trim() !== ""; } }; }
    }
  } else if (asset.type === "rule") {
    note.textContent = "Expressões usam o parser seguro do NEXUS; não aceitam JavaScript.";
    addTextarea("expression", "Expressão", payload.expression ?? payload.formula ?? "", 4);
    addSelect("resultType", "Resultado esperado", payload.resultType ?? "boolean", [
      ["boolean", "Verdadeiro/falso"], ["number", "Número"], ["string", "Texto"]
    ]);
  } else if (asset.type === "behavior") {
    note.textContent = "O comportamento reage a eventos e referencia um fluxo registrado. Não contém scripts.";
    addInput("events", "Eventos (separados por vírgula)", Array.isArray(payload.events) ? payload.events.join(", ") : payload.event ?? "");
    addInput("flowId", "ID do fluxo", payload.flowId ?? "");
    const available = runtime?.actionTypes ?? [];
    note.textContent += available.length ? " Ações registradas: " + available.join(", ") : " Nenhum executor de ação está registrado no runtime nesta sessão.";
  } else if (asset.type === "flow") {
    note.textContent = "Gatilhos, condições e ações são dados declarativos. Tipos de ação precisam de executores registrados.";
    addTextarea("triggers", "Gatilhos (JSON)", payload.triggers ?? [], 4);
    addTextarea("conditions", "Condições (JSON)", payload.conditions ?? [], 5);
    addTextarea("actions", "Ações (JSON)", payload.actions ?? [], 6);
    addSelect("conditionJoin", "Combinar condições", payload.conditionJoin ?? "all", [["all", "Todas (AND)"], ["any", "Qualquer (OR)"]]);
    addSelect("onError", "Em caso de erro", payload.execution?.onError ?? "stop", [["stop", "Interromper"], ["continue", "Continuar"]]);
    const available = runtime?.actionTypes ?? [];
    note.textContent += available.length ? " Ações registradas: " + available.join(", ") : " Nenhum executor de ação está registrado no runtime nesta sessão.";
  } else if (asset.type === "function") {
    note.textContent = "Este editor registra metadados e a referência de uma função confiável. A implementação executável vem do Core ou de um módulo.";
    addInput("functionId", "ID da função registrada", payload.functionId ?? "");
    addInput("signature", "Assinatura", payload.signature ?? "");
    addSelect("returnType", "Tipo de retorno", payload.returnType ?? "any", [
      ["any", "Qualquer"], ["void", "Sem retorno"], ["string", "Texto"],
      ["number", "Número"], ["boolean", "Verdadeiro/falso"], ["object", "Objeto"], ["array", "Lista"]
    ]);
    addTextarea("arguments", "Argumentos (JSON)", payload.arguments ?? [], 4);
    const available = runtime?.functionIds ?? [];
    note.textContent += available.length ? " Funções registradas: " + available.join(", ") : " Nenhuma implementação de função está registrada no runtime nesta sessão.";
  }

  const actions = make("div", "nexus-library-logic-editor-actions");
  const save = make("button", "nexus-library-logic-editor-save", "Salvar definição");
  save.type = "submit";
  const status = make("p", "nexus-library-logic-editor-status");
  actions.append(save);
  form.append(actions, status);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    save.disabled = true;
    status.textContent = "Validando e salvando…";
    try {
      const draft = {};
      for (const [key, input] of Object.entries(fields)) {
        if (key === "hasDefault") draft.hasDefault = input.checked === true;
        else if (key === "defaultValue") draft.defaultValue = input.value;
        else draft[key] = input.value;
      }
      const nextPayload = buildLogicEditorPayload(asset.type, payload, draft);
      await onSave({ ...asset, payload: nextPayload });
      status.textContent = "Definição salva e validada.";
    } catch (error) {
      status.textContent = String(error?.message ?? error);
    } finally {
      save.disabled = false;
    }
  });
  section.append(heading, note, form);
  return section;
}
