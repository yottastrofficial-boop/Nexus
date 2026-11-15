/**
 * Safe arithmetic evaluator for NEXUS property formulas.
 * Supports numeric literals, property identifiers, + - * / and parentheses.
 * It never evaluates JavaScript or invokes arbitrary functions.
 */
export function evaluateNexusFormula(expression, resolveProperty, options = {}) {
  const source = String(expression ?? "").trim();
  const maxLength = Math.min(1000, Math.max(1, Number(options.maxLength) || 500));
  const maxTokens = Math.min(256, Math.max(1, Number(options.maxTokens) || 128));
  const maxDepth = Math.min(32, Math.max(1, Number(options.maxDepth) || 16));
  if (!source || source.length > maxLength || typeof resolveProperty !== "function") return null;

  const tokens = [];
  const pattern = /\s*([A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*|(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-])\s*/gy;
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
      if (nesting > maxDepth) throw new Error("Formula nesting limit exceeded");
      const value = sum();
      if (tokens[index++] !== ")") throw new Error("Unclosed formula parenthesis");
      nesting -= 1;
      return value;
    }
    if (token === "+") return primary();
    if (token === "-") return -primary();
    if (token === undefined) throw new Error("Missing formula value");
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
    if (token.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) {
      throw new Error("Unsafe property reference");
    }
    const resolved = resolveProperty(token);
    if (resolved === undefined || resolved === null || resolved === "") throw new Error("Unknown formula property");
    const value = Number(resolved);
    if (!Number.isFinite(value)) throw new Error("Formula property is not numeric");
    return value;
  };
  const product = () => {
    let value = primary();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const right = primary();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  const sum = () => {
    let value = product();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = product();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  try {
    const result = sum();
    return index === tokens.length && Number.isFinite(result) ? result : null;
  } catch (_) {
    return null;
  }
}
