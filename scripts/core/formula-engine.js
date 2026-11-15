/**
 * Safe expression evaluator for NEXUS.
 * Supports numeric expressions, modulo and comparisons without evaluating JavaScript.
 */
function evaluateExpression(expression, resolveProperty, options = {}) {
  let source = String(expression ?? "").trim();
  source = source.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, "$1").trim();
  const maxLength = Math.min(1000, Math.max(1, Number(options.maxLength) || 500));
  const maxTokens = Math.min(256, Math.max(1, Number(options.maxTokens) || 128));
  const maxDepth = Math.min(32, Math.max(1, Number(options.maxDepth) || 16));
  if (!source || source.length > maxLength || typeof resolveProperty !== "function") return null;

  const tokens = [];
  const pattern = /\s*(@?[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*|(?:\d+(?:\.\d*)?|\.\d+)|>=|<=|==|!=|=|[()+*/%<>-])\s*/gy;
  let cursor = 0;
  while (cursor < source.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(source);
    if (!match) return null;
    tokens.push(match[1]);
    if (tokens.length > maxTokens) return null;
    cursor = pattern.lastIndex;
  }
  if (!tokens.length) return null;

  let index = 0;
  let nesting = 0;
  const primary = () => {
    const token = tokens[index++];
    if (token === "(") {
      nesting += 1;
      if (nesting > maxDepth) throw new Error("Expression nesting limit exceeded");
      const value = comparison();
      if (tokens[index++] !== ")") throw new Error("Unclosed expression parenthesis");
      nesting -= 1;
      return value;
    }
    if (token === "+") return primary();
    if (token === "-") {
      const value = primary();
      if (typeof value !== "number") throw new Error("Unary operator requires a number");
      return -value;
    }
    if (token === undefined) throw new Error("Missing expression value");
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
    const reference = token.startsWith("@") ? token.slice(1) : token;
    if (reference.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) {
      throw new Error("Unsafe property reference");
    }
    const resolved = resolveProperty(reference);
    if (resolved === undefined || resolved === null || resolved === "") throw new Error("Unknown expression property");
    const value = Number(resolved);
    if (!Number.isFinite(value)) throw new Error("Expression property is not numeric");
    return value;
  };
  const product = () => {
    let value = primary();
    while (["*", "/", "%"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = primary();
      if (typeof value !== "number" || typeof right !== "number") throw new Error("Arithmetic requires numbers");
      if ((operator === "/" || operator === "%") && right === 0) throw new Error("Division or modulo by zero");
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  };
  const sum = () => {
    let value = product();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = product();
      if (typeof value !== "number" || typeof right !== "number") throw new Error("Arithmetic requires numbers");
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const comparison = () => {
    const left = sum();
    const operator = tokens[index];
    if (!["==", "=", "!=", ">", ">=", "<", "<="].includes(operator)) return left;
    index += 1;
    const right = sum();
    if (typeof left !== "number" || typeof right !== "number") throw new Error("Comparisons require numbers");
    switch (operator) {
      case "==":
      case "=": return left === right;
      case "!=": return left !== right;
      case ">": return left > right;
      case ">=": return left >= right;
      case "<": return left < right;
      case "<=": return left <= right;
      default: return false;
    }
  };

  try {
    const result = comparison();
    if (index !== tokens.length) return null;
    if (typeof result === "number" && !Number.isFinite(result)) return null;
    return result;
  } catch (_) {
    return null;
  }
}

export function evaluateNexusExpression(expression, resolveProperty, options = {}) {
  return evaluateExpression(expression, resolveProperty, options);
}

export function evaluateNexusFormula(expression, resolveProperty, options = {}) {
  const result = evaluateExpression(expression, resolveProperty, options);
  return typeof result === "number" && Number.isFinite(result) ? result : null;
}

export function evaluateNexusCondition(expression, resolveProperty, options = {}) {
  const result = evaluateExpression(expression, resolveProperty, options);
  return typeof result === "boolean" ? result : null;
}
