import { INTERACTION_EVENTS } from "../core/interactions.js";
import { FOUNDRY_LOGIC_EVENTS } from "../core/foundry-logic-integration.js";
import { layoutFlowGraph, getFlowGraphCanvasSize, connectFlowNodes } from "./flow-graph-layout.js";

const clone = value => structuredClone(value ?? {});
const newId = prefix => prefix + "-" + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const make = (tag, className, value = "") => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== "") element.textContent = String(value);
  return element;
};

export function buildLogicEditorPayload(type, basePayload = {}, draft = {}) {
  const payload = clone(basePayload);
  const value = key => String(draft[key] ?? "");
  const parseArray = key => {
    if (Array.isArray(draft[key])) return clone(draft[key]);
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
    if (hasOwn(draft, "graph")) { if (draft.graph === null) delete payload.graph; else payload.graph = clone(draft.graph); }
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
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function createFlowBuilder(form, payload, runtime) {
  const root = make("div", "nexus-library-flow-builder");
  const types = [...new Set(runtime?.actionTypes ?? [])];
  const data = { triggers: Array.isArray(payload.triggers) ? clone(payload.triggers) : [], conditions: Array.isArray(payload.conditions) ? clone(payload.conditions) : [], actions: Array.isArray(payload.actions) ? clone(payload.actions) : [] };
  const sections = {};
  const field = (title, control, wide = false) => { const label = make("label", "nexus-library-flow-field" + (wide ? " wide" : "")); label.append(make("span", "", title), control); return label; };
  const text = (value, placeholder) => { const node = make("input", ""); node.type = "text"; node.value = String(value ?? ""); node.placeholder = placeholder ?? ""; return node; };
  const select = (value, options) => { const node = make("select", ""); options.forEach(pair => { const opt = make("option", "", pair[1]); opt.value = pair[0]; opt.selected = pair[0] === value; node.append(opt); }); return node; };
  const remove = callback => { const button = make("button", "nexus-library-flow-remove", "Remover"); button.type = "button"; button.addEventListener("click", callback); return button; };
  const section = (key, title, description, rowFactory, fresh) => {
    const group = make("section", "nexus-library-flow-group"); const head = make("div", "nexus-library-flow-group-head");
    const intro = make("div", ""); intro.append(make("strong", "", title), make("small", "", description));
    const rows = make("div", "nexus-library-flow-rows");
    const render = () => { rows.replaceChildren(); data[key].forEach((item, index) => rows.append(rowFactory(item, () => { data[key].splice(index, 1); render(); }))); if (!data[key].length) rows.append(make("p", "nexus-library-flow-empty", "Nenhum item configurado.")); };
    const add = make("button", "nexus-library-flow-add", "+ Adicionar"); add.type = "button"; add.addEventListener("click", () => { data[key].push(fresh()); render(); });
    head.append(intro, add); group.append(head, rows); root.append(group); sections[key] = rows; render();
  };
  section("triggers", "Gatilhos", "Eventos que iniciam o fluxo.", (item, onRemove) => {
    const row = make("article", "nexus-library-flow-row"); row.dataset.id = item.id ?? newId("trigger");
    const event = select(item.event ?? INTERACTION_EVENTS[0], INTERACTION_EVENTS.map(value => [value, value])); event.dataset.field = "event";
    const modifiers = text(Array.isArray(item.modifiers) ? item.modifiers.join("+") : item.modifiers, "ctrl+shift"); modifiers.dataset.field = "modifiers";
    const key = text(item.key, "Tecla opcional"); key.dataset.field = "key";
    const duration = text(item.durationMs, "600"); duration.dataset.field = "durationMs";
    row.append(field("Evento", event), field("Modificadores", modifiers), field("Tecla", key), field("Duração (ms)", duration), remove(onRemove)); return row;
  }, () => ({ id: newId("trigger"), event: INTERACTION_EVENTS[0] }));
  section("conditions", "Condições", "Expressões avaliadas antes das ações pelo parser seguro.", (item, onRemove) => {
    const row = make("article", "nexus-library-flow-row"); row.dataset.id = item.id ?? newId("condition");
    const expression = make("textarea", ""); expression.rows = 2; expression.spellcheck = false; expression.value = item.expression ?? ""; expression.placeholder = "@system.resources.pv.value > 0"; expression.dataset.field = "expression";
    row.append(field("Expressão", expression, true), remove(onRemove)); return row;
  }, () => ({ id: newId("condition"), expression: "" }));
  section("actions", "Ações", "Executores devem ser registrados pelo Core ou por módulos confiáveis.", (item, onRemove) => {
    const row = make("article", "nexus-library-flow-row"); row.dataset.id = item.id ?? newId("action");
    const name = text(item.name, "Nome opcional"); name.dataset.field = "name";
    const options = [...types]; if (item.type && !options.includes(item.type)) options.push(item.type);
    const type = options.length ? select(item.type ?? "", options.map(value => [value, value])) : text(item.type, "namespace.acao"); type.dataset.field = "type";
    const enabled = make("input", ""); enabled.type = "checkbox"; enabled.checked = item.enabled !== false; enabled.dataset.field = "enabled";
    const config = make("textarea", ""); config.rows = 3; config.spellcheck = false; config.value = JSON.stringify(item.config ?? {}, null, 2); config.dataset.field = "config";
    const active = make("label", "nexus-library-flow-enabled"); active.append(enabled, make("span", "", "Ação ativa"));
    row.append(field("Nome", name), field("Tipo do executor", type), field("Configuração (JSON)", config, true), active, remove(onRemove)); return row;
  }, () => ({ id: newId("action"), type: types[0] ?? "", enabled: true, config: {} }));
  form.append(root);
  return { read() {
    const result = {};
    for (const key of Object.keys(data)) result[key] = [...sections[key].querySelectorAll(".nexus-library-flow-row")].map(row => {
      const get = name => row.querySelector('[data-field="' + name + '"]'); const id = row.dataset.id;
      if (key === "triggers") return { id, event: get("event").value, modifiers: get("modifiers").value.split("+").map(x => x.trim()).filter(Boolean), key: get("key").value, durationMs: get("durationMs").value ? Number(get("durationMs").value) : undefined };
      if (key === "conditions") return { id, expression: get("expression").value };
      let config; try { config = JSON.parse(get("config").value || "{}"); } catch { throw new Error("Configuração da ação deve ser JSON válido."); }
      if (!isRecord(config)) throw new Error("Configuração da ação deve ser um objeto JSON.");
      return { id, name: get("name").value, type: get("type").value, enabled: get("enabled").checked, config };
    });
    return result;
  } };
}


function createFlowGraphBuilder(form, payload, runtime) {
  const root = make("section", "nexus-library-graph-builder");
  let graph = isRecord(payload.graph) ? layoutFlowGraph(clone(payload.graph)) : null;
  let connectMode = false;
  let connectingFrom = null;
  let selectedNodeId = graph?.nodes?.[0]?.id ?? null;
  const configDrafts = new Map();
  if (graph) {
    graph.nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    graph.edges = Array.isArray(graph.edges) ? graph.edges : [];
  }

  const nodeTypeOptions = [["condition", "Condição"], ["action", "Ação"], ["end", "Fim"]];
  const definitions = typeof runtime?.getActionDefinitions === "function"
    ? runtime.getActionDefinitions()
    : Array.isArray(runtime?.actionDefinitions) ? runtime.actionDefinitions : [];
  const actionTypes = [...new Set([...(runtime?.actionTypes ?? []), ...definitions.map(item => item.type)])];
  const definitionByType = new Map(definitions.map(item => [item.type, item]));
  const makeSelect = (value, options) => {
    const node = make("select", "");
    options.forEach(([key, label]) => {
      const option = make("option", "", label);
      option.value = key;
      option.selected = key === value;
      node.append(option);
    });
    return node;
  };
  const toolbar = make("div", "nexus-library-graph-toolbar");
  const title = make("div", "");
  title.append(
    make("strong", "", "Grafo de execução"),
    make("small", "", "Selecione um nó para editar suas propriedades no Inspector. Arraste para organizar.")
  );
  const toolbarActions = make("div", "nexus-library-graph-toolbar-actions");
  const addType = makeSelect("condition", nodeTypeOptions);
  const addNode = make("button", "nexus-library-flow-add", "+ Adicionar nó");
  addNode.type = "button";
  const connectType = makeSelect("next", [["next", "Próxima"], ["true", "Verdadeiro"], ["false", "Falso"]]);
  const connectModeButton = make("button", "nexus-library-flow-add", "Conectar nós");
  connectModeButton.type = "button";
  const arrange = make("button", "nexus-library-flow-add", "Organizar automaticamente");
  arrange.type = "button";
  const toggle = make("button", "nexus-library-flow-add", graph ? "Remover grafo" : "Criar grafo visual");
  toggle.type = "button";
  toolbarActions.append(addType, addNode, connectType, connectModeButton, arrange, toggle);
  toolbar.append(title, toolbarActions);

  const status = make("p", "nexus-library-flow-empty", "Grafo opcional. Fluxos existentes continuam usando gatilhos, condições e ações sequenciais.");
  const connectHint = make("p", "nexus-library-graph-connect-hint", "");
  connectHint.hidden = true;
  const canvasScroll = make("div", "nexus-library-graph-canvas-scroll");
  const canvas = make("div", "nexus-library-graph-canvas");
  const arrowId = newId("flow-arrow");
  const wires = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wires.classList.add("nexus-library-graph-wires");
  wires.setAttribute("aria-hidden", "true");
  const nodesWrap = make("div", "nexus-library-graph-canvas-nodes");
  canvas.append(wires, nodesWrap);
  canvasScroll.append(canvas);

  const inspector = make("aside", "nexus-library-graph-inspector");
  inspector.setAttribute("aria-label", "Inspector do nó selecionado");
  const edgesWrap = make("div", "nexus-library-graph-edges");
  const content = make("div", "nexus-library-graph-content");
  content.append(connectHint, canvasScroll, inspector, edgesWrap);

  const makeText = (value, placeholder, type = "text") => {
    const node = make("input", "");
    node.type = type;
    node.value = value == null ? "" : String(value);
    node.placeholder = placeholder ?? "";
    return node;
  };
  const field = (label, control, wide = false) => {
    const wrap = make("label", "nexus-library-flow-field" + (wide ? " wide" : ""));
    wrap.append(make("span", "", label), control);
    return wrap;
  };
  const freshNode = type => {
    const id = newId("node");
    if (type === "condition") return { id, type, name: "Nova condição", expression: "true" };
    if (type === "action") return { id, type, name: "Nova ação", action: { id: newId("action"), type: actionTypes[0] ?? "", enabled: true, config: {} } };
    return { id, type, name: "Fim" };
  };
  const svgElement = (tag, attrs = {}) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    return element;
  };
  const drawEdges = size => {
    wires.replaceChildren();
    wires.setAttribute("viewBox", "0 0 " + size.width + " " + size.height);
    wires.setAttribute("width", String(size.width));
    wires.setAttribute("height", String(size.height));
    const defs = svgElement("defs");
    const marker = svgElement("marker", { id: arrowId, markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: "auto" });
    marker.append(svgElement("path", { d: "M0 0 L6 3 L0 6", fill: "none", stroke: "currentColor", "stroke-width": 1.2 }));
    defs.append(marker);
    wires.append(defs);
    const byId = new Map(graph.nodes.map(node => [node.id, node]));
    for (const edge of graph.edges) {
      const from = byId.get(edge.from), to = byId.get(edge.to);
      if (!from || !to) continue;
      const x1 = (Number(from.x) || 0) + 220, y1 = (Number(from.y) || 0) + 66;
      const x2 = Number(to.x) || 0, y2 = (Number(to.y) || 0) + 66;
      const bend = Math.max(45, Math.abs(x2 - x1) * .45);
      wires.append(svgElement("path", {
        d: "M " + x1 + " " + y1 + " C " + (x1 + bend) + " " + y1 + ", " + (x2 - bend) + " " + y2 + ", " + x2 + " " + y2,
        class: "nexus-library-graph-wire " + (edge.when === "true" ? "is-true" : edge.when === "false" ? "is-false" : "is-next"),
        "marker-end": "url(#" + arrowId + ")"
      }));
      if (edge.when && edge.when !== "next") {
        const label = svgElement("text", { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 7, class: "nexus-library-graph-wire-label" });
        label.textContent = edge.when === "true" ? "Verdadeiro" : "Falso";
        wires.append(label);
      }
    }
  };
  const setNodeConfig = (node, key, value) => {
    node.action.config = isRecord(node.action.config) ? node.action.config : {};
    if (value === undefined) delete node.action.config[key];
    else node.action.config[key] = value;
  };
  const renderInspector = () => {
    inspector.replaceChildren();
    if (!graph) { inspector.hidden = true; return; }
    const node = graph.nodes.find(item => item.id === selectedNodeId);
    if (!node) {
      inspector.hidden = false;
      inspector.append(make("p", "nexus-library-flow-empty", "Selecione um nó no canvas para editar suas propriedades."));
      return;
    }
    inspector.hidden = false;
    const head = make("div", "nexus-library-graph-inspector-head");
    head.append(
      make("strong", "", "Inspector · " + (node.type === "start" ? "Início" : node.type === "condition" ? "Condição" : node.type === "action" ? "Ação" : "Fim")),
      make("span", "nexus-library-graph-inspector-id", node.id)
    );
    inspector.append(head);
    const name = makeText(node.name ?? "", "Nome do nó");
    name.addEventListener("input", () => {
      node.name = name.value;
      const cardTitle = nodesWrap.querySelector('[data-node-id="' + node.id + '"] .nexus-library-graph-node-title');
      if (cardTitle) cardTitle.textContent = (node.type === "start" ? "Início" : node.type === "condition" ? "Condição" : node.type === "action" ? "Ação" : "Fim") + " · " + (node.name || "Sem nome");
    });
    inspector.append(field("Nome", name));

    if (node.type === "condition") {
      const expression = make("textarea", "");
      expression.rows = 3;
      expression.spellcheck = false;
      expression.value = node.expression ?? "";
      expression.placeholder = "@system.resources.pv.value > 0";
      expression.addEventListener("input", () => { node.expression = expression.value; });
      inspector.append(field("Expressão", expression, true));
    }

    if (node.type === "action") {
      node.action = isRecord(node.action) ? node.action : { id: newId("action"), type: "", enabled: true, config: {} };
      node.action.config = isRecord(node.action.config) ? node.action.config : {};
      const availableTypes = [...actionTypes];
      if (node.action.type && !availableTypes.includes(node.action.type)) availableTypes.push(node.action.type);
      const actionType = availableTypes.length
        ? makeSelect(node.action.type ?? "", availableTypes.map(value => [value, value]))
        : makeText(node.action.type ?? "", "namespace.executor");
      actionType.addEventListener("change", () => {
        if (actionType.value === node.action.type) return;
        node.action.type = actionType.value;
        node.action.config = {};
        for (const key of [...configDrafts.keys()]) if (key.startsWith(node.id + "::")) configDrafts.delete(key);
        render();
      });
      inspector.append(field("Executor", actionType));
      const enabled = make("input", "");
      enabled.type = "checkbox";
      enabled.checked = node.action.enabled !== false;
      enabled.addEventListener("change", () => { node.action.enabled = enabled.checked; });
      const active = make("label", "nexus-library-flow-enabled");
      active.append(enabled, make("span", "", "Ação ativa"));
      inspector.append(active);

      const definition = definitionByType.get(node.action.type);
      const schemaFields = definition?.configSchema?.fields;
      if (Array.isArray(schemaFields) && schemaFields.length) {
        for (const schemaField of schemaFields) {
          const key = node.id + "::" + schemaField.key;
          if (!Object.prototype.hasOwnProperty.call(node.action.config, schemaField.key) && Object.prototype.hasOwnProperty.call(schemaField, "defaultValue")) {
            node.action.config[schemaField.key] = structuredClone(schemaField.defaultValue);
          }
          const stored = node.action.config[schemaField.key];
          let control;
          if (schemaField.type === "checkbox") {
            control = make("input", "");
            control.type = "checkbox";
            control.checked = stored === true;
            control.addEventListener("change", () => setNodeConfig(node, schemaField.key, control.checked));
          } else if (schemaField.type === "select") {
            const options = schemaField.options.map(option => [option.value, option.label]);
            if (stored != null && !options.some(option => option[0] === stored)) options.unshift([String(stored), "Valor atual indisponível: " + stored]);
            control = makeSelect(stored ?? "", options);
            control.addEventListener("change", () => setNodeConfig(node, schemaField.key, control.value));
          } else if (schemaField.type === "textarea" || schemaField.type === "json") {
            control = make("textarea", "");
            control.rows = schemaField.rows ?? 3;
            control.spellcheck = false;
            const draft = configDrafts.has(key) ? configDrafts.get(key) : schemaField.type === "json" && stored !== undefined ? JSON.stringify(stored, null, 2) : stored ?? "";
            control.value = String(draft);
            if (schemaField.type === "json") {
              control.addEventListener("input", () => configDrafts.set(key, control.value));
              control.addEventListener("change", () => {
                try {
                  setNodeConfig(node, schemaField.key, JSON.parse(control.value));
                  configDrafts.delete(key);
                } catch { /* Draft remains visible; read() reports the validation error. */ }
              });
            } else control.addEventListener("input", () => setNodeConfig(node, schemaField.key, control.value));
          } else {
            control = makeText(stored ?? "", schemaField.placeholder, schemaField.type === "number" ? "number" : "text");
            if (schemaField.type === "number") {
              if (schemaField.step !== undefined) control.step = String(schemaField.step);
              if (schemaField.min !== undefined) control.min = String(schemaField.min);
              if (schemaField.max !== undefined) control.max = String(schemaField.max);
              control.addEventListener("input", () => {
                if (!control.value.trim()) setNodeConfig(node, schemaField.key, undefined);
                else if (Number.isFinite(Number(control.value))) setNodeConfig(node, schemaField.key, Number(control.value));
              });
            } else control.addEventListener("input", () => setNodeConfig(node, schemaField.key, control.value));
          }
          if (schemaField.required) control.required = true;
          if (schemaField.placeholder && !["textarea", "json"].includes(schemaField.type)) control.placeholder = schemaField.placeholder;
          const wrap = field(schemaField.label, control, ["textarea", "json"].includes(schemaField.type));
          if (schemaField.help) wrap.append(make("small", "nexus-library-graph-field-help", schemaField.help));
          inspector.append(wrap);
        }
      } else {
        const configKey = node.id + "::__fallback";
        const config = make("textarea", "");
        config.rows = 5;
        config.spellcheck = false;
        config.value = configDrafts.has(configKey) ? configDrafts.get(configKey) : node.action.__configDraft ?? JSON.stringify(node.action.config ?? {}, null, 2);
        config.addEventListener("input", () => configDrafts.set(configKey, config.value));
        inspector.append(field("Configuração JSON", config, true));
        inspector.append(make("small", "nexus-library-graph-field-help", "Este executor ainda não fornece um schema visual. A configuração JSON permanece disponível."));
      }
    }
  };

  const render = () => {
    nodesWrap.replaceChildren();
    edgesWrap.replaceChildren();
    if (!graph) {
      content.hidden = true;
      status.hidden = false;
      arrange.disabled = true;
      addNode.disabled = true;
      addType.disabled = true;
      connectType.disabled = true;
      connectModeButton.disabled = true;
      inspector.hidden = true;
      return;
    }
    graph = layoutFlowGraph(graph);
    content.hidden = false;
    status.hidden = true;
    arrange.disabled = false;
    addNode.disabled = false;
    addType.disabled = false;
    connectType.disabled = false;
    connectModeButton.disabled = false;
    connectModeButton.textContent = connectMode ? "Cancelar conexão" : "Conectar nós";
    connectHint.hidden = !connectMode;
    connectHint.textContent = connectMode
      ? (connectingFrom ? "Origem selecionada. Agora selecione o nó de destino." : "Modo conexão: selecione o nó de origem e depois o destino.")
      : "";
    const size = getFlowGraphCanvasSize(graph);
    canvas.style.width = size.width + "px";
    canvas.style.height = size.height + "px";
    drawEdges(size);

    graph.nodes.forEach(node => {
      const card = make("article", "nexus-library-graph-node nexus-library-graph-node-" + node.type + (node.id === selectedNodeId ? " is-selected" : ""));
      card.dataset.nodeId = node.id;
      card.style.left = (Number(node.x) || 0) + "px";
      card.style.top = (Number(node.y) || 0) + "px";
      const head = make("div", "nexus-library-graph-node-head");
      const typeLabel = node.type === "start" ? "Início" : node.type === "condition" ? "Condição" : node.type === "action" ? "Ação" : "Fim";
      const heading = make("strong", "nexus-library-graph-node-title", typeLabel + " · " + (node.name || "Sem nome"));
      heading.title = node.id;
      head.append(heading);
      const edit = make("button", "nexus-library-flow-add", node.id === selectedNodeId ? "Selecionado" : "Editar");
      edit.type = "button";
      edit.setAttribute("aria-pressed", node.id === selectedNodeId ? "true" : "false");
      edit.addEventListener("click", () => { selectedNodeId = node.id; render(); });
      head.append(edit);
      const type = makeSelect(node.type, node.type === "start" ? [["start", "Início"]] : nodeTypeOptions.map(([key, label]) => [key, label]));
      type.disabled = node.type === "start";
      type.addEventListener("change", () => {
        node.type = type.value;
        if (node.type === "condition" && !node.expression) node.expression = "true";
        if (node.type === "action" && !node.action) node.action = { id: newId("action"), type: actionTypes[0] ?? "", enabled: true, config: {} };
        if (node.type !== "action") {
          delete node.action;
          for (const key of [...configDrafts.keys()]) if (key.startsWith(node.id + "::")) configDrafts.delete(key);
        }
        selectedNodeId = node.id;
        render();
      });
      head.append(type);
      if (node.type !== "start") {
        const removeNode = make("button", "nexus-library-flow-remove", "Remover");
        removeNode.type = "button";
        removeNode.addEventListener("click", () => {
          graph.nodes = graph.nodes.filter(item => item.id !== node.id);
          graph.edges = graph.edges.filter(edge => edge.from !== node.id && edge.to !== node.id);
          for (const key of [...configDrafts.keys()]) if (key.startsWith(node.id + "::")) configDrafts.delete(key);
          if (selectedNodeId === node.id) selectedNodeId = graph.nodes[0]?.id ?? null;
          render();
        });
        head.append(removeNode);
      }
      const drag = make("span", "nexus-library-graph-drag-handle", "⠿ Arrastar");
      head.append(drag);
      const port = make("button", "nexus-library-graph-port", connectingFrom === node.id ? "Origem" : "Selecionar");
      port.type = "button";
      port.disabled = !connectMode;
      port.addEventListener("click", event => {
        event.stopPropagation();
        if (!connectMode) return;
        if (!connectingFrom) {
          connectingFrom = node.id;
          render();
          return;
        }
        try {
          graph = connectFlowNodes(graph, connectingFrom, node.id, connectType.value);
          connectingFrom = null;
          render();
          connectHint.textContent = "Conexão criada. Você pode selecionar outra origem ou cancelar.";
        } catch (error) {
          connectHint.hidden = false;
          connectHint.textContent = String(error?.message ?? error);
        }
      });
      head.append(port);
      if (connectingFrom === node.id) card.classList.add("is-connect-source");
      head.addEventListener("pointerdown", event => {
        if (event.target.closest("button,select")) return;
        event.preventDefault();
        head.setPointerCapture?.(event.pointerId);
        const originX = event.clientX, originY = event.clientY;
        const baseX = Number(node.x) || 0, baseY = Number(node.y) || 0;
        const move = moveEvent => {
          node.x = Math.max(0, Math.min(4800, baseX + moveEvent.clientX - originX));
          node.y = Math.max(0, Math.min(4800, baseY + moveEvent.clientY - originY));
          card.style.left = node.x + "px";
          card.style.top = node.y + "px";
          const nextSize = getFlowGraphCanvasSize(graph);
          canvas.style.width = nextSize.width + "px";
          canvas.style.height = nextSize.height + "px";
          drawEdges(nextSize);
        };
        const finish = () => {
          head.removeEventListener("pointermove", move);
          head.removeEventListener("pointerup", finish);
          head.removeEventListener("pointercancel", finish);
        };
        head.addEventListener("pointermove", move);
        head.addEventListener("pointerup", finish, { once: true });
        head.addEventListener("pointercancel", finish, { once: true });
      });
      const summary = node.type === "condition"
        ? (node.expression || "Expressão não configurada")
        : node.type === "action"
          ? (node.action?.type || "Executor não selecionado")
          : node.type === "start" ? "Ponto de entrada do fluxo" : "Finaliza este caminho";
      const description = make("small", "nexus-library-graph-node-summary", summary);
      card.append(head, description);
      nodesWrap.append(card);
    });

    renderInspector();
    drawEdges(size);
    const edgeHead = make("div", "nexus-library-graph-section-head");
    edgeHead.append(make("strong", "", "Conexões (" + graph.edges.length + ")"));
    const addEdge = make("button", "nexus-library-flow-add", "+ Conectar nós");
    addEdge.type = "button";
    addEdge.disabled = graph.nodes.length < 2;
    addEdge.addEventListener("click", () => { graph.edges.push({ from: "", to: "", when: "next" }); render(); });
    edgeHead.append(addEdge);
    edgesWrap.append(edgeHead);
    graph.edges.forEach((edge, index) => {
      const row = make("article", "nexus-library-graph-edge");
      const from = makeSelect(edge.from, [["", "Selecionar nó"], ...graph.nodes.map(item => [item.id, (item.name || item.type) + " · " + item.id])]);
      const when = makeSelect(edge.when ?? "next", [["next", "Próxima"], ["true", "Verdadeiro"], ["false", "Falso"]]);
      const to = makeSelect(edge.to, [["", "Selecionar nó"], ...graph.nodes.map(item => [item.id, (item.name || item.type) + " · " + item.id])]);
      from.addEventListener("change", () => { edge.from = from.value; render(); });
      when.addEventListener("change", () => { edge.when = when.value; render(); });
      to.addEventListener("change", () => { edge.to = to.value; render(); });
      const removeEdge = make("button", "nexus-library-flow-remove", "Remover");
      removeEdge.type = "button";
      removeEdge.addEventListener("click", () => { graph.edges.splice(index, 1); render(); });
      row.append(field("De", from), field("Saída", when), field("Para", to), removeEdge);
      edgesWrap.append(row);
    });
  };

  toggle.addEventListener("click", () => {
    if (graph) {
      graph = null;
      selectedNodeId = null;
      toggle.textContent = "Criar grafo visual";
    } else {
      const start = { id: newId("node"), type: "start", name: "Início", x: 40, y: 40 };
      const end = { id: newId("node"), type: "end", name: "Fim", x: 340, y: 40 };
      graph = { entryNodeId: start.id, nodes: [start, end], edges: [{ from: start.id, to: end.id, when: "next" }] };
      selectedNodeId = start.id;
      toggle.textContent = "Remover grafo";
    }
    render();
  });
  addNode.addEventListener("click", () => {
    if (!graph) return;
    const node = freshNode(addType.value);
    node.x = Math.max(40, ...graph.nodes.map(item => (Number(item.x) || 0) + 280));
    node.y = 40;
    graph.nodes.push(node);
    selectedNodeId = node.id;
    graph = layoutFlowGraph(graph);
    render();
  });
  connectModeButton.addEventListener("click", () => {
    connectMode = !connectMode;
    connectingFrom = null;
    render();
  });
  arrange.addEventListener("click", () => { if (graph) { graph = layoutFlowGraph(graph, { force: true }); render(); } });
  root.append(toolbar, status, content);
  form.append(root);
  render();

  const flushConfigDrafts = () => {
    if (!graph) return;
    for (const node of graph.nodes) {
      if (node.type !== "action" || !isRecord(node.action)) continue;
      const fallbackKey = node.id + "::__fallback";
      if (configDrafts.has(fallbackKey)) {
        let config;
        try { config = JSON.parse(configDrafts.get(fallbackKey) || "{}"); }
        catch { throw new Error("Configuração JSON do executor " + (node.action.type || "") + " é inválida."); }
        if (!isRecord(config)) throw new Error("A configuração do executor precisa ser um objeto JSON.");
        node.action.config = config;
        delete node.action.__configDraft;
        configDrafts.delete(fallbackKey);
      }
      const definition = definitionByType.get(node.action.type);
      for (const schemaField of definition?.configSchema?.fields ?? []) {
        const key = node.id + "::" + schemaField.key;
        if (!configDrafts.has(key)) continue;
        try { setNodeConfig(node, schemaField.key, JSON.parse(configDrafts.get(key))); }
        catch { throw new Error("O campo " + schemaField.label + " precisa conter JSON válido."); }
        configDrafts.delete(key);
      }
    }
  };

  return {
    read() {
      if (!graph) return { graph: null };
      flushConfigDrafts();
      return { graph: clone(graph) };
    }
  };
}

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
  let flowBuilder = null;
  let flowGraphBuilder = null;
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
  const addCheckbox = (key, labelText, checked) => {
    const label = make("label", "nexus-library-logic-field nexus-library-logic-checkbox");
    const input = make("input", "");
    input.type = "checkbox";
    input.name = key;
    input.checked = checked === true;
    fields[key] = input;
    label.append(input, make("span", "", labelText));
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
    addCheckbox("hasDefault", "Definir valor padrão", hasOwn(payload, "defaultValue"));
    addInput("defaultValue", "Valor padrão (JSON)", hasOwn(payload, "defaultValue") ? JSON.stringify(payload.defaultValue) : "");
  } else if (asset.type === "rule") {
    note.textContent = "Expressões usam o parser seguro do NEXUS; não aceitam JavaScript.";
    addTextarea("expression", "Expressão", payload.expression ?? payload.formula ?? "", 4);
    addSelect("resultType", "Resultado esperado", payload.resultType ?? "boolean", [
      ["boolean", "Verdadeiro/falso"], ["number", "Número"], ["string", "Texto"]
    ]);
  } else if (asset.type === "behavior") {
    note.textContent = "O comportamento reage a eventos de interface ou do ciclo de vida do Foundry e referencia um fluxo registrado. Eventos Foundry: " + FOUNDRY_LOGIC_EVENTS.join(", ") + ". Não contém scripts.";
    addInput("events", "Eventos (separados por vírgula)", Array.isArray(payload.events) ? payload.events.join(", ") : payload.event ?? "");
    addInput("flowId", "ID do fluxo", payload.flowId ?? "");
    const available = runtime?.actionTypes ?? [];
    note.textContent += available.length ? " Ações registradas: " + available.join(", ") : " Nenhum executor de ação está registrado no runtime nesta sessão.";
  } else if (asset.type === "flow") {
    note.textContent = "Gatilhos, condições e ações são dados declarativos. Tipos de ação precisam de executores registrados.";
    flowBuilder = createFlowBuilder(form, payload, runtime);
    flowGraphBuilder = createFlowGraphBuilder(form, payload, runtime);
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
  if (asset.type === "flow" && typeof runtime?.simulateFlow === "function") {
    const simulate = make("button", "nexus-library-logic-editor-simulate", "Simular sem salvar");
    simulate.type = "button";
    simulate.addEventListener("click", async () => {
      simulate.disabled = true;
      status.textContent = "Simulando sem executar ações…";
      try {
        const draft = {};
        for (const [key, input] of Object.entries(fields)) {
          draft[key] = input.type === "checkbox" ? input.checked : input.value;
        }
        Object.assign(draft, flowBuilder.read(), flowGraphBuilder?.read?.() ?? {});
        const nextPayload = buildLogicEditorPayload("flow", payload, draft);
        const actor = globalThis.game?.user?.character ?? null;
        const context = {
          actor,
          document: actor,
          system: actor?.system?.toObject?.() ?? actor?.system ?? null
        };
        const result = await runtime.simulateFlow({ ...asset, payload: nextPayload }, context);
        const path = (result.trace ?? []).map(step => {
          const node = nextPayload.graph?.nodes?.find(item => item.id === step.nodeId);
          const label = node?.name || step.nodeId;
          return label + (step.result === true ? " (Verdadeiro)" : step.result === false ? " (Falso)" : "");
        }).join(" → ");
        const summary = (result.actions ?? []).map(item => {
          const node = nextPayload.graph?.nodes?.find(candidate => candidate.id === item.nodeId);
          return (node?.name || item.type) + ": " + item.status;
        }).join(" · ");
        const details = [
          path ? "Caminho: " + path : "",
          summary ? "Ações: " + summary : (result.reason === "conditions" ? "As condições não foram satisfeitas." : "Nenhuma ação ativa para avaliar.")
        ].filter(Boolean).join(" | ");
        status.textContent = "Simulação: " + result.status + ". " + details + " Nenhuma ação foi executada.";
      } catch (error) {
        status.textContent = "Falha na simulação: " + String(error?.message ?? error);
      } finally {
        simulate.disabled = false;
      }
    });
    actions.append(simulate);
  }
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
      if (flowBuilder) Object.assign(draft, flowBuilder.read(), flowGraphBuilder?.read?.() ?? {});
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
