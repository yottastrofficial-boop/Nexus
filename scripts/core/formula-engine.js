/**
 * Safe expression evaluator for NEXUS.
 * Supports numbers, quoted strings, concatenation, arithmetic and comparisons.
 * It never evaluates JavaScript or accesses global objects.
 */
function evaluateExpression(expression, resolveProperty, options = {}) {
  let source = String(expression ?? "").trim();
  source = source.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, "$1").trim();
  const maxLength = Math.min(1000, Math.max(1, Number(options.maxLength) || 500));
  const maxTokens = Math.min(256, Math.max(1, Number(options.maxTokens) || 128));
  const maxDepth = Math.min(32, Math.max(1, Number(options.maxDepth) || 16));
  if (!source || source.length > maxLength || typeof resolveProperty !== "function") return null;

  const tokens = [];
  const pattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@?[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*)|(>=|<=|==|!=|&&|\|\||=|[(),+*/%<>!^-]))\s*/gy;
  let cursor = 0;
  while (cursor < source.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(source);
    if (!match) return null;
    if (match[1] !== undefined) tokens.push({ type: "number", value: Number(match[1]) });
    else if (match[2] !== undefined) {
      let value;
      try {
        value = match[2][0] === '"'
          ? JSON.parse(match[2])
          : match[2].slice(1, -1).replace(/\\(['\\nrt])/g, (_, escaped) => ({ "'": "'", "\\": "\\", n: "\n", r: "\r", t: "\t" })[escaped]);
      } catch (_) { return null; }
      tokens.push({ type: "string", value });
    } else if (match[3] !== undefined) tokens.push({ type: "identifier", value: match[3] });
    else tokens.push({ type: "operator", value: match[4] });
    if (tokens.length > maxTokens) return null;
    cursor = pattern.lastIndex;
  }
  if (!tokens.length) return null;

  const isPrimitive = value => value === null || ["string", "number", "boolean"].includes(typeof value);
  const isEmptyValue = value => typeof value === "string" && value.trim() === "";
  const numericValue = value => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && isEmptyValue(value)) return 0;
    if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
    return null;
  };
  const equalValues = (left, right) => {
    if (typeof left === "number" && typeof right === "string" && numericValue(right) !== null) return left === numericValue(right);
    if (typeof right === "number" && typeof left === "string" && numericValue(left) !== null) return numericValue(left) === right;
    return typeof left === typeof right && left === right;
  };
  const stringify = value => {
    if (!isPrimitive(value) || value === null) throw new Error("Only primitive values can be concatenated");
    return String(value);
  };

  let index = 0, nesting = 0;
  const primary = () => {
    const token = tokens[index++];
    if (!token) throw new Error("Missing expression value");
    if (token.type === "number" || token.type === "string") return token.value;
    if (token.type === "operator" && token.value === "(") {
      nesting += 1;
      if (nesting > maxDepth) throw new Error("Expression nesting limit exceeded");
      const value = logicalOr();
      if (tokens[index++]?.value !== ")") throw new Error("Unclosed expression parenthesis");
      nesting -= 1;
      return value;
    }
    if (token.type === "operator" && token.value === "+") {
      const value = primary();
      if (numericValue(value) === null) throw new Error("Unary operator requires a number");
      return numericValue(value);
    }
    if (token.type === "operator" && token.value === "-") {
      const value = primary();
      if (numericValue(value) === null) throw new Error("Unary operator requires a number");
      return -numericValue(value);
    }
    if (token.type !== "identifier") throw new Error("Unexpected expression token");
    const identifier = token.value;
    if (identifier === "true") return true;
    if (identifier === "false") return false;
    if (identifier === "null") return null;
    if (tokens[index]?.value === "(") {
      const allowed = new Set(["min", "max", "ceil", "floor", "round", "abs", "sign", "if", "contains", "isempty", "isnotempty"]);
      if (!allowed.has(identifier.toLowerCase())) throw new Error("Unsupported formula function");
      index++;
      const args = [];
      if (tokens[index]?.value !== ")") {
        while (true) {
          args.push(comparison());
          if (tokens[index]?.value !== ",") break;
          index++;
        }
      }
      if (tokens[index++]?.value !== ")") throw new Error("Unclosed function call");
      const name = identifier.toLowerCase();
      const numbers = args.map(numericValue);
      if (name === "if") {
        if (args.length !== 3 || typeof args[0] !== "boolean") throw new Error("if requires a boolean and two values");
        return args[0] ? args[1] : args[2];
      }
      if (name === "contains") {
        if (args.length !== 2) throw new Error("contains requires two values");
        return String(args[0] ?? "").includes(String(args[1] ?? ""));
      }
      if (name === "isempty" || name === "isnotempty") {
        if (args.length !== 1) throw new Error(name + " requires one value");
        const empty = args[0] === null || args[0] === undefined || (typeof args[0] === "string" && args[0].trim() === "");
        return name === "isempty" ? empty : !empty;
      }
      if (numbers.some(value => value === null)) throw new Error("Formula function requires numbers");
      if (name === "min" && args.length >= 1) return Math.min(...numbers);
      if (name === "max" && args.length >= 1) return Math.max(...numbers);
      if (args.length !== 1) throw new Error("Formula function requires one argument");
      if (name === "ceil") return Math.ceil(numbers[0]);
      if (name === "floor") return Math.floor(numbers[0]);
      if (name === "round") return Math.round(numbers[0]);
      if (name === "abs") return Math.abs(numbers[0]);
      if (name === "sign") return Math.sign(numbers[0]);
      throw new Error("Invalid formula function");
    }
    const displayReference = identifier.startsWith("@");
    const reference = displayReference ? identifier.slice(1) : identifier;
    if (!reference || reference.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) throw new Error("Unsafe property reference");
    const resolved = resolveProperty(reference, { display: displayReference, raw: !displayReference });
    if (resolved === undefined) throw new Error("Unknown expression property");
    return resolved;
  };
  const product = () => {
    let value = primary();
    while (["*", "/", "%"].includes(tokens[index]?.value)) {
      const operator = tokens[index++].value, right = primary();
      const leftNumber = numericValue(value), rightNumber = numericValue(right);
      if (leftNumber === null || rightNumber === null) throw new Error("Arithmetic requires numbers");
      if ((operator === "/" || operator === "%") && rightNumber === 0) throw new Error("Division or modulo by zero");
      value = operator === "*" ? leftNumber * rightNumber : operator === "/" ? leftNumber / rightNumber : leftNumber % rightNumber;
    }
    return value;
  };
  const sum = () => {
    let value = product();
    while (tokens[index]?.value === "+" || tokens[index]?.value === "-") {
      const operator = tokens[index++].value, right = product();
      if (operator === "+") {
        if (typeof value === "number" && (typeof right === "number" || isEmptyValue(right))) value += numericValue(right);
        else if (isEmptyValue(value) && typeof right === "number") value = numericValue(value) + right;
        else value = stringify(value) + stringify(right);
      } else {
        const leftNumber = numericValue(value), rightNumber = numericValue(right);
        if (leftNumber === null || rightNumber === null) throw new Error("Subtraction requires numbers");
        value = leftNumber - rightNumber;
      }
    }
    return value;
  };
  const comparison = () => {
    const left = sum(), operator = tokens[index]?.value;
    if (!["==", "=", "!=", ">", ">=", "<", "<="].includes(operator)) return left;
    index += 1;
    const right = sum();
    if (operator === "==" || operator === "=") return equalValues(left, right);
    if (operator === "!=") return !equalValues(left, right);
    const a = numericValue(left), b = numericValue(right);
    if (a === null || b === null) throw new Error("Ordered comparisons require numbers");
    switch (operator) {
      case ">": return a > b;
      case ">=": return a >= b;
      case "<": return a < b;
      case "<=": return a <= b;
      default: return false;
    }
  };
  const isLogical = value => typeof value === "boolean";
  const logicalNot = () => {
    const token=tokens[index],word=token?.type==="identifier"?token.value.toUpperCase():"";
    if(word==="NOT"||token?.value==="!"){index++;const value=logicalNot();if(!isLogical(value))throw new Error("NOT requires a boolean");return !value;}
    return comparison();
  };
  const logicalAnd = () => {
    let value=logicalNot();
    while(true){
      const token=tokens[index],word=token?.type==="identifier"?token.value.toUpperCase():"";
      const op=word==="AND"||token?.value==="&&"?"AND":word==="NAND"?"NAND":"";
      if(!op)break;index++;const right=logicalNot();
      if(!isLogical(value)||!isLogical(right))throw new Error(op+" requires booleans");
      value=op==="AND"?(value&&right):!(value&&right);
    }
    return value;
  };
  const logicalXor = () => {
    let value=logicalAnd();
    while(tokens[index]?.type==="identifier"&&tokens[index].value.toUpperCase()==="XOR"){
      index++;const right=logicalAnd();if(!isLogical(value)||!isLogical(right))throw new Error("XOR requires booleans");value=value!==right;
    }
    return value;
  };
  const logicalOr = () => {
    let value=logicalXor();
    while(true){
      const token=tokens[index],word=token?.type==="identifier"?token.value.toUpperCase():"";
      const op=word==="OR"||token?.value==="||"?"OR":word==="NOR"?"NOR":"";
      if(!op)break;index++;const right=logicalXor();
      if(!isLogical(value)||!isLogical(right))throw new Error(op+" requires booleans");
      value=op==="OR"?(value||right):!(value||right);
    }
    return value;
  };

  try {
    const result = logicalOr();
    if (index !== tokens.length) return null;
    if (typeof result === "number" && !Number.isFinite(result)) return null;
    return result;
  } catch (_) { return null; }
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
