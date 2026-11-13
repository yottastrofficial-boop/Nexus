import {
  INTERACTION_EVENTS,
  INTERACTION_ACTIONS,
  INTERACTION_OPERATORS,
  getComponentInteractions,
  normalizeInteraction
} from "./interactions.js";

const EVENT_LABELS = {
  click: "Clique", doubleClick: "Duplo clique", rightClick: "Clique direito",
  hover: "Passar o cursor", change: "Alteração de campo", submit: "Envio",
  propertyUpdate: "Atualização de propriedade", drag: "Arrastar", drop: "Soltar",
  open: "Abertura", close: "Fechamento"
};
const ACTION_LABELS = {
  roll: "Rolar", calculate: "Calcular", update: "Atualizar propriedade",
  open: "Abrir", toggle: "Alternar componente", interact: "Acionar outro componente",
  execute: "Executar operação controlada"
};
const OPERATOR_LABELS = {
  equals: "Igual a", notEquals: "Diferente de", greaterThan: "Maior que",
  greaterOrEqual: "Maior ou igual", lessThan: "Menor que",
  lessOrEqual: "Menor ou igual", contains: "Contém", truthy: "Possui valor", falsy: "Sem valor"
};
const createId = prefix => `${prefix}-${globalThis.foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10)}`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function field(labelText, control) {
  const label = element("label", "nexus-interaction-field", labelText);
  label.append(control);
  return label;
}
function input(value, type = "text", placeholder = "") {
  const node = document.createElement("input");
  node.type = type;
  node.value = value == null ? "" : String(value);
  if (placeholder) node.placeholder = placeholder;
  return node;
}
function select(options, value) {
  const node = document.createElement("select");
  for (const [key, label] of options) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    node.append(option);
  }
  node.value = value ?? options[0]?.[0] ?? "";
  return node;
}
function actionConfigFields(action, targets) {
  const config = action.config ?? {};
  const fields = [];
  const add = (name, control) => {
    control.dataset.configKey = name;
    fields.push(field(({ formula: "Fórmula", path: "Propriedade", value: "Valor", valueType: "Tipo de valor", target: "Destino", url: "Endereço", targetId: "Componente de destino", interactionId: "Fluxo de destino", command: "Operação" })[name] ?? name, control));
  };
  if (action.type === "roll") {
    add("formula", input(config.formula, "text", "1d20 + @DES"));
  } else if (action.type === "calculate") {
    add("formula", input(config.formula, "text", "Expressão de cálculo"));
    add("path", input(config.path, "text", "Propriedade que receberá o resultado"));
  } else if (action.type === "update") {
    add("path", input(config.path, "text", "Propriedade a atualizar"));
    add("value", input(config.value, "text", "Novo valor"));
    add("valueType", select([["string", "Texto"], ["number", "Número"], ["boolean", "Verdadeiro/Falso"]], config.valueType ?? "string"));
  } else if (action.type === "open") {
    add("target", select([["actor-sheet", "Ficha do personagem"], ["url", "Endereço externo"]], config.target ?? "actor-sheet"));
    add("url", input(config.url, "url", "https://"));
  } else if (action.type === "toggle") {
    add("targetId", select([["", "Selecione um componente"], ...targets.map(item => [item.id, item.customLabel || item.type])], config.targetId));
  } else if (action.type === "interact") {
    add("targetId", select([["", "Selecione um componente"], ...targets.map(item => [item.id, item.customLabel || item.type])], config.targetId));
    add("interactionId", input(config.interactionId, "text", "ID do fluxo de destino"));
  } else if (action.type === "execute") {
    add("command", select([["refresh", "Atualizar ficha"], ["notify", "Exibir mensagem"]], config.command ?? "refresh"));
    if (config.command === "notify") add("value", input(config.value, "text", "Mensagem"));
  }
  return fields;
}

export function renderInteractionEditor(root, component, onChange, targets = []) {
  if (!root) return;
  root.replaceChildren();
  root.classList.add("nexus-interaction-editor");
  if (!component) return;

  let flows = getComponentInteractions(component).map(flow => ({
    ...flow,
    triggers: flow.triggers.map(trigger => ({ ...trigger })),
    conditions: flow.conditions.map(condition => ({ ...condition })),
    actions: flow.actions.map(action => ({ ...action, config: { ...action.config } }))
  }));

  const persist = () => {
    flows = flows.map((flow, index) => normalizeInteraction(flow, index)).filter(Boolean);
    onChange?.(flows);
  };
  const toolbar = element("div", "nexus-interaction-toolbar");
  const addFlow = element("button", "nexus-interaction-add", "Adicionar fluxo");
  addFlow.type = "button";
  addFlow.addEventListener("click", () => {
    flows.push({
      id: createId("interaction"), name: `Interação ${flows.length + 1}`, enabled: true,
      triggers: [{ id: createId("trigger"), event: "click" }], conditions: [],
      actions: [{ id: createId("action"), type: "roll", enabled: true, config: {} }],
      execution: { mode: "sequential", onError: "stop" }
    });
    persist();
    renderInteractionEditor(root, { ...component, interactions: flows }, onChange, targets);
  });
  toolbar.append(addFlow);
  root.append(toolbar);

  if (!flows.length) {
    root.append(element("p", "nexus-interaction-empty", "Nenhum fluxo configurado."));
    return;
  }

  const eventOptions = INTERACTION_EVENTS.map(key => [key, EVENT_LABELS[key] ?? key]);
  const actionOptions = INTERACTION_ACTIONS.map(key => [key, ACTION_LABELS[key] ?? key]);
  const operatorOptions = INTERACTION_OPERATORS.map(key => [key, OPERATOR_LABELS[key] ?? key]);

  flows.forEach((flow, flowIndex) => {
    const card = element("section", "nexus-interaction-flow");
    card.dataset.flowIndex = String(flowIndex);
    const heading = element("div", "nexus-interaction-flow-heading");
    const name = input(flow.name, "text", "Nome do fluxo");
    name.dataset.flowField = "name";
    const enabled = input(flow.enabled ? "true" : "false", "checkbox");
    enabled.checked = flow.enabled !== false;
    enabled.dataset.flowField = "enabled";
    const remove = element("button", "nexus-interaction-remove", "Remover fluxo");
    remove.type = "button"; remove.dataset.command = "remove-flow";
    heading.append(field("Fluxo", name), field("Ativo", enabled), remove);
    card.append(heading);

    const triggers = element("div", "nexus-interaction-section");
    triggers.append(element("h6", "", "Triggers"));
    flow.triggers.forEach((trigger, triggerIndex) => {
      const row = element("div", "nexus-interaction-row");
      const eventSelect = select(eventOptions, trigger.event);
      eventSelect.dataset.triggerField = "event";
      eventSelect.dataset.triggerIndex = String(triggerIndex);
      const removeTrigger = element("button", "nexus-interaction-icon-button", "×");
      removeTrigger.type = "button"; removeTrigger.dataset.command = "remove-trigger"; removeTrigger.dataset.triggerIndex = String(triggerIndex);
      row.append(field("Evento", eventSelect), removeTrigger);
      triggers.append(row);
    });
    const addTrigger = element("button", "nexus-interaction-secondary", "Adicionar trigger");
    addTrigger.type = "button"; addTrigger.dataset.command = "add-trigger";
    triggers.append(addTrigger);
    card.append(triggers);

    const conditions = element("div", "nexus-interaction-section");
    conditions.append(element("h6", "", "Condições · todas devem ser atendidas"));
    flow.conditions.forEach((condition, conditionIndex) => {
      const row = element("div", "nexus-interaction-condition");
      const path = input(condition.path, "text", "Propriedade");
      path.dataset.conditionField = "path"; path.dataset.conditionIndex = String(conditionIndex);
      const operator = select(operatorOptions, condition.operator);
      operator.dataset.conditionField = "operator"; operator.dataset.conditionIndex = String(conditionIndex);
      const value = input(condition.value, "text", "Valor");
      value.dataset.conditionField = "value"; value.dataset.conditionIndex = String(conditionIndex);
      const removeCondition = element("button", "nexus-interaction-icon-button", "×");
      removeCondition.type = "button"; removeCondition.dataset.command = "remove-condition"; removeCondition.dataset.conditionIndex = String(conditionIndex);
      row.append(field("Propriedade", path), field("Comparação", operator), field("Valor", value), removeCondition);
      conditions.append(row);
    });
    const addCondition = element("button", "nexus-interaction-secondary", "Adicionar condição");
    addCondition.type = "button"; addCondition.dataset.command = "add-condition";
    conditions.append(addCondition);
    card.append(conditions);

    const actions = element("div", "nexus-interaction-section");
    actions.append(element("h6", "", "Actions"));
    flow.actions.forEach((action, actionIndex) => {
      const row = element("article", "nexus-interaction-action");
      const actionHead = element("div", "nexus-interaction-action-heading");
      const type = select(actionOptions, action.type);
      type.dataset.actionField = "type"; type.dataset.actionIndex = String(actionIndex);
      const active = input(action.enabled === false ? "false" : "true", "checkbox");
      active.checked = action.enabled !== false;
      active.dataset.actionField = "enabled"; active.dataset.actionIndex = String(actionIndex);
      const removeAction = element("button", "nexus-interaction-icon-button", "×");
      removeAction.type = "button"; removeAction.dataset.command = "remove-action"; removeAction.dataset.actionIndex = String(actionIndex);
      const up = element("button", "nexus-interaction-icon-button", "↑");
      up.type = "button"; up.dataset.command = "move-action-up"; up.dataset.actionIndex = String(actionIndex); up.disabled = actionIndex === 0;
      const down = element("button", "nexus-interaction-icon-button", "↓");
      down.type = "button"; down.dataset.command = "move-action-down"; down.dataset.actionIndex = String(actionIndex); down.disabled = actionIndex === flow.actions.length - 1;
      actionHead.append(field("Operação", type), field("Ativa", active), up, down, removeAction);
      row.append(actionHead);
      const config = element("div", "nexus-interaction-config");
      actionConfigFields(action, targets).forEach(control => {
        const inputNode = control.querySelector("input,select");
        inputNode.dataset.actionIndex = String(actionIndex);
        config.append(control);
      });
      row.append(config);
      actions.append(row);
    });
    const addAction = element("button", "nexus-interaction-secondary", "Adicionar ação");
    addAction.type = "button"; addAction.dataset.command = "add-action";
    actions.append(addAction);
    card.append(actions);

    const execution = element("div", "nexus-interaction-execution");
    const onError = select([["stop", "Interromper em caso de falha"], ["continue", "Continuar após falha"]], flow.execution?.onError ?? "stop");
    onError.dataset.flowField = "onError";
    execution.append(field("Execução", onError));
    card.append(execution);
    root.append(card);
  });

  if (root.dataset.bound === "true") return;
  root.dataset.bound = "true";
  root.addEventListener("change", event => {
    const target = event.target;
    const card = target.closest("[data-flow-index]");
    if (!card) return;
    const flow = flows[Number(card.dataset.flowIndex)];
    if (!flow) return;
    if (target.dataset.flowField) {
      if (target.dataset.flowField === "enabled") flow.enabled = target.checked;
      else if (target.dataset.flowField === "onError") flow.execution = { ...flow.execution, onError: target.value };
      else flow.name = target.value;
    } else if (target.dataset.triggerField) {
      const trigger = flow.triggers[Number(target.dataset.triggerIndex)];
      if (trigger) trigger[target.dataset.triggerField] = target.value;
    } else if (target.dataset.conditionField) {
      const condition = flow.conditions[Number(target.dataset.conditionIndex)];
      if (condition) condition[target.dataset.conditionField] = target.value;
    } else if (target.dataset.actionField) {
      const action = flow.actions[Number(target.dataset.actionIndex)];
      if (action) {
        if (target.dataset.actionField === "enabled") action.enabled = target.checked;
        else { action.type = target.value; action.config = {}; }
      }
    } else if (target.dataset.configKey) {
      const action = flow.actions[Number(target.dataset.actionIndex)];
      if (action) action.config[target.dataset.configKey] = target.type === "checkbox" ? target.checked : target.value;
    }
    persist();
    if (target.dataset.actionField === "type") renderInteractionEditor(root, { ...component, interactions: flows }, onChange, targets);
  });

  root.addEventListener("click", event => {
    const button = event.target.closest("button[data-command]");
    if (!button) return;
    const card = button.closest("[data-flow-index]");
    if (!card) return;
    const flow = flows[Number(card.dataset.flowIndex)];
    if (!flow) return;
    const index = Number(button.dataset.actionIndex ?? button.dataset.triggerIndex ?? button.dataset.conditionIndex);
    switch (button.dataset.command) {
      case "remove-flow": flows.splice(Number(card.dataset.flowIndex), 1); break;
      case "add-trigger": flow.triggers.push({ id: createId("trigger"), event: "click" }); break;
      case "remove-trigger": flow.triggers.splice(Number(button.dataset.triggerIndex), 1); break;
      case "add-condition": flow.conditions.push({ id: createId("condition"), path: "", operator: "equals", value: "" }); break;
      case "remove-condition": flow.conditions.splice(Number(button.dataset.conditionIndex), 1); break;
      case "add-action": flow.actions.push({ id: createId("action"), type: "roll", enabled: true, config: {} }); break;
      case "remove-action": flow.actions.splice(index, 1); break;
      case "move-action-up": if (index > 0) [flow.actions[index - 1], flow.actions[index]] = [flow.actions[index], flow.actions[index - 1]]; break;
      case "move-action-down": if (index < flow.actions.length - 1) [flow.actions[index + 1], flow.actions[index]] = [flow.actions[index], flow.actions[index + 1]]; break;
      default: return;
    }
    persist();
    renderInteractionEditor(root, { ...component, interactions: flows }, onChange, targets);
  });
}
