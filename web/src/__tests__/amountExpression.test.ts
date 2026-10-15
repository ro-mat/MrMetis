import moment from "moment";
import {
  evaluateExpression,
  formatExpression,
  validateExpression,
} from "services/amountExpression";
import { Calculate } from "services/budgetFormula";
import { BudgetPair } from "services/budgetPair";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";
import { AmountOperator, AmountToken } from "types/IAmount";

const num = (value: number): AmountToken => ({ kind: "number", value });
const op = (operator: AmountOperator): AmountToken => ({
  kind: "operator",
  operator,
});
const open: AmountToken = { kind: "paren", paren: "(" };
const close: AmountToken = { kind: "paren", paren: ")" };

// April 2024 (30 days, starts on Monday), after March 2024
const month = moment("2024-04-01");
const prevMonth = moment("2024-03-01");

const pair = (
  budgetId: number,
  accountId: number,
  planned: number,
  budgetType: BudgetTypeUser | BudgetTypeExtra = BudgetTypeUser.spending
) => new BudgetPair(budgetId, accountId, month, budgetType, planned, 0, []);

const evaluate = (
  tokens: AmountToken[],
  cur = new Calculate(month, []),
  prev = new Calculate(prevMonth, [])
) => evaluateExpression(tokens, cur, prev);

describe("amount expressions", () => {
  it.each<[string, AmountToken[], number]>([
    ["a number", [num(12.345)], 12.35],
    ["× before +", [num(2), op("+"), num(3), op("*"), num(4)], 14],
    ["÷ before −", [num(10), op("-"), num(6), op("/"), num(3)], 8],
    ["left to right", [num(10), op("-"), num(3), op("-"), num(2)], 5],
    [
      "parentheses first",
      [open, num(2), op("+"), num(3), close, op("*"), num(4)],
      20,
    ],
    [
      "nested parentheses",
      [num(2), op("*"), open, open, num(1), op("+"), num(2), close, close],
      6,
    ],
    ["negative numbers", [num(-5), op("*"), num(2)], -10],
  ])("calculates %s", (_, tokens, result) => {
    expect(validateExpression(tokens)).toBeUndefined();
    expect(evaluate(tokens)).toBe(result);
  });

  it.each<[string, AmountToken[] | undefined, string]>([
    ["nothing", [], "errors.expressionEmpty"],
    ["stored before expressions", undefined, "errors.expressionEmpty"],
    ["two values in a row", [num(1), num(2)], "errors.expressionInvalid"],
    [
      "two operators in a row",
      [num(1), op("+"), op("-"), num(2)],
      "errors.expressionInvalid",
    ],
    ["an operator at the end", [num(1), op("*")], "errors.expressionInvalid"],
    ["an operator first", [op("-"), num(1)], "errors.expressionInvalid"],
    ["empty parentheses", [open, close], "errors.expressionInvalid"],
    [
      "a value after parentheses",
      [open, num(1), close, num(2)],
      "errors.expressionInvalid",
    ],
    ["an unclosed parenthesis", [open, num(1)], "errors.expressionParens"],
    [
      "an extra closing parenthesis",
      [num(1), close],
      "errors.expressionParens",
    ],
  ])("rejects %s", (_, tokens, error) => {
    expect(validateExpression(tokens)).toBe(error);
    expect(evaluate(tokens as AmountToken[])).toBe(error);
  });

  it("allows only numbers where asked", () => {
    const withBudget: AmountToken[] = [
      num(1),
      op("+"),
      { kind: "budget", budgetId: 3 },
    ];
    expect(validateExpression(withBudget)).toBeUndefined();
    expect(validateExpression(withBudget, true)).toBe(
      "errors.expressionNumbersOnly"
    );
    expect(
      validateExpression([num(1), op("+"), num(2)], true)
    ).toBeUndefined();
  });

  it("can't divide by zero", () => {
    expect(evaluate([num(1), op("/"), num(0)])).toBe(
      "errors.expressionNotFinite"
    );
  });

  it.each([
    [0, 4],
    [1, 5],
    [2, 5],
    [6, 4],
  ])("counts weekday %i in the month", (weekday, count) => {
    expect(evaluate([{ kind: "weekdays", weekday: weekday as 0 }])).toBe(
      count
    );
  });

  it("takes values from the previous month when asked", () => {
    expect(evaluate([{ kind: "daysInMonth" }])).toBe(30);
    expect(evaluate([{ kind: "daysInMonth", prevMonth: true }])).toBe(31);
    // March 2024 starts on Friday
    expect(
      evaluate([{ kind: "weekdays", weekday: 5, prevMonth: true }])
    ).toBe(5);
  });

  it("uses budgets and totals, per account or of all accounts", () => {
    const pairs = [
      pair(3, 1, 10),
      pair(3, 2, 15),
      // a transfer is counted once
      pair(4, 1, 7, BudgetTypeUser.transferToAccount),
      pair(4, 2, 7, BudgetTypeExtra.transferFromAccount),
      pair(0, 0, 40),
      pair(0, 2, 25),
    ];
    const cur = new Calculate(month, pairs);

    expect(evaluate([{ kind: "budget", budgetId: 3 }], cur)).toBe(25);
    expect(evaluate([{ kind: "budget", budgetId: 3, accountId: 2 }], cur)).toBe(
      15
    );
    expect(evaluate([{ kind: "budget", budgetId: 4 }], cur)).toBe(7);
    expect(
      evaluate([{ kind: "total", budgetType: BudgetTypeUser.spending }], cur)
    ).toBe(40);
    expect(
      evaluate(
        [{ kind: "total", budgetType: BudgetTypeUser.spending, accountId: 2 }],
        cur
      )
    ).toBe(25);
  });

  it("waits for values that aren't calculated yet", () => {
    const cur = new Calculate(month, [pair(3, 1, 10)], new Set([3]));
    expect(evaluate([{ kind: "budget", budgetId: 3 }], cur)).toBeNaN();
    expect(
      evaluate([{ kind: "total", budgetType: BudgetTypeUser.income }], cur)
    ).toBeNaN();

    // once nothing is pending, a missing total is still being calculated
    cur.pendingBudgetIds = new Set();
    expect(evaluate([{ kind: "budget", budgetId: 3 }], cur)).toBe(10);
    expect(
      evaluate([{ kind: "total", budgetType: BudgetTypeUser.income }], cur)
    ).toBeNaN();
  });

  it("formats an expression as text", () => {
    expect(
      formatExpression([
        open,
        { kind: "budget", budgetId: 3, accountId: 2 },
        op("+"),
        num(20),
        close,
        op("*"),
        { kind: "daysInMonth", prevMonth: true },
      ])
    ).toBe("( budget 3 @2 + 20 ) × days in month (prev month)");
  });
});
