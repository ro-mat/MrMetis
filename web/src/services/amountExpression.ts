import { roundTo } from "helpers/numberHelper";
import { AmountOperator, AmountToken } from "types/IAmount";
import type { Calculate } from "./budgetFormula";

// An amount expression is a list of tokens: values, operators and
// parentheses, e.g. ( budget 3 + 20 ) * 2.

export type ValueToken = Exclude<
  AmountToken,
  { kind: "operator" } | { kind: "paren" }
>;

type Ast =
  | { value: ValueToken }
  | { operator: AmountOperator; left: Ast; right: Ast };

const isOperator = (
  token: AmountToken | undefined,
  operators: AmountOperator[]
): token is Extract<AmountToken, { kind: "operator" }> =>
  token?.kind === "operator" && operators.includes(token.operator);

const isParen = (token: AmountToken | undefined, paren: "(" | ")") =>
  token?.kind === "paren" && token.paren === paren;

export const isValueToken = (token: AmountToken): token is ValueToken =>
  token.kind !== "operator" && token.kind !== "paren";

// Returns the syntax tree, or the error (i18n key) when the tokens don't make
// an expression. Stored data from before expressions has none.
const parseExpression = (
  tokens: AmountToken[] | undefined
): { ast: Ast } | { error: string } => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { error: "errors.expressionEmpty" };
  }

  let pos = 0;

  // value | "(" sum ")"
  const term = (): Ast => {
    const token = tokens[pos++];
    if (token && isValueToken(token)) {
      return { value: token };
    }
    if (!isParen(token, "(")) {
      // an operator or ")" where a value belongs, or nothing after an operator
      throw "errors.expressionInvalid";
    }
    const inner = sum();
    if (isParen(tokens[pos], ")")) {
      pos++;
      return inner;
    }
    throw pos < tokens.length
      ? "errors.expressionInvalid"
      : "errors.expressionParens";
  };

  // × and ÷ bind tighter than + and −
  const product = (): Ast => {
    let left = term();
    while (isOperator(tokens[pos], ["*", "/"])) {
      const { operator } = tokens[pos++] as { operator: AmountOperator };
      left = { operator, left, right: term() };
    }
    return left;
  };

  const sum = (): Ast => {
    let left = product();
    while (isOperator(tokens[pos], ["+", "-"])) {
      const { operator } = tokens[pos++] as { operator: AmountOperator };
      left = { operator, left, right: product() };
    }
    return left;
  };

  try {
    const ast = sum();
    if (pos < tokens.length) {
      // a value right after a value, or a ")" without its "("
      throw isParen(tokens[pos], ")")
        ? "errors.expressionParens"
        : "errors.expressionInvalid";
    }
    return { ast };
  } catch (e) {
    return { error: e as string };
  }
};

// The error (i18n key) of an invalid expression, undefined when it's valid.
// With `numbersOnly` the only values allowed are numbers (e.g. overrides).
export const validateExpression = (
  tokens: AmountToken[] | undefined,
  numbersOnly = false
) => {
  const parsed = parseExpression(tokens);
  if ("error" in parsed) {
    return parsed.error;
  }
  if (
    numbersOnly &&
    tokens!.some((t) => isValueToken(t) && t.kind !== "number")
  ) {
    return "errors.expressionNumbersOnly";
  }
  return undefined;
};

// undefined while the value isn't calculated yet
const valueOf = (
  token: ValueToken,
  cur: Calculate,
  prev: Calculate
): number | undefined => {
  if (token.kind === "number") {
    return token.value;
  }
  const month = token.prevMonth ? prev : cur;
  switch (token.kind) {
    case "budget":
      return month.getItem(token.budgetId, token.accountId);
    case "total":
      return month.getTotal(token.budgetType, token.accountId);
    case "daysInMonth":
      return month.getDaysInMonth();
    case "weekdays":
      return month.getWeekdaysInMonth(token.weekday);
  }
};

const evaluate = (
  ast: Ast,
  cur: Calculate,
  prev: Calculate
): number | undefined => {
  if ("value" in ast) {
    return valueOf(ast.value, cur, prev);
  }
  const left = evaluate(ast.left, cur, prev);
  const right = evaluate(ast.right, cur, prev);
  if (left === undefined || right === undefined) {
    return undefined;
  }
  switch (ast.operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
  }
};

// The rounded result; NaN while something it uses isn't calculated yet, or
// the error (i18n key) when it can't be calculated at all.
export const evaluateExpression = (
  tokens: AmountToken[] | undefined,
  cur: Calculate,
  prev: Calculate
): number | string => {
  const parsed = parseExpression(tokens);
  if ("error" in parsed) {
    return parsed.error;
  }
  const result = evaluate(parsed.ast, cur, prev);
  if (result === undefined || isNaN(result)) {
    return NaN;
  }
  if (!isFinite(result)) {
    return "errors.expressionNotFinite";
  }
  return roundTo(result, 2);
};

export const operatorSigns: Record<AmountOperator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

// Shows a value with ids, for messages outside the UI.
const formatValueWithIds = (token: ValueToken) => {
  const account =
    "accountId" in token && token.accountId ? ` @${token.accountId}` : "";
  const prev = "prevMonth" in token && token.prevMonth ? " (prev month)" : "";
  switch (token.kind) {
    case "number":
      return String(token.value);
    case "budget":
      return `budget ${token.budgetId}${account}${prev}`;
    case "total":
      return `total ${token.budgetType}${account}${prev}`;
    case "daysInMonth":
      return `days in month${prev}`;
    case "weekdays":
      return `weekdays ${token.weekday}${prev}`;
  }
};

// Readable text of an expression, e.g. "( budget 3 + 20 ) × 2".
export const formatExpression = (
  tokens: AmountToken[] | undefined,
  formatValue: (token: ValueToken) => string = formatValueWithIds
) =>
  (Array.isArray(tokens) ? tokens : [])
    .map((t) => {
      if (t.kind === "operator") return operatorSigns[t.operator];
      if (t.kind === "paren") return t.paren;
      return formatValue(t);
    })
    .join(" ");
