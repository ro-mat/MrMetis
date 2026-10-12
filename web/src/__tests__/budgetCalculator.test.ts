import { flattenBudgetPairs } from "helpers/budgetMapper";
import { getDemoData, initDemoData } from "helpers/demoHelper";
import moment from "moment";
import { buildBudgetPairsForMonth } from "services/budgetBuilder";
import { BudgetPair } from "services/budgetPair";
import {
  Calculate,
  RelevantFormula,
  getRelevantFormulas,
} from "services/budgetFormula";
import { evaluateExpression } from "services/amountExpression";
import { AmountToken } from "types/IAmount";
import {
  calculateForNextMonth,
  getEstimation,
  getUserTotals,
  userTypes,
} from "services/budgetTotals";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";

// the demo data and expected amounts depend on the calendar (e.g. groceries are planned
// per Saturday), so pin "today" to a month with 4 Saturdays after one with 5
const num = (value: number): AmountToken => ({ kind: "number", value });

vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 11, 12) });
afterAll(() => {
  vi.useRealTimers();
});

describe("budgetCalculator", () => {
  beforeEach(() => {
    initDemoData();
  });

  it("getRelevantFormulas should always return non-empty list", () => {
    const { budgets } = getDemoData();

    for (const budget of budgets) {
      const formulas = getRelevantFormulas(moment().toDate(), budget);

      expect(formulas).toBeInstanceOf(Array);
      expect(formulas).not.toHaveLength(0);
    }
  });

  it("getRelevantFormulas from non-zero budget amount should return correct formulas", () => {
    const { budgets } = getDemoData();
    const salaryBudget = budgets.find((b) => b.id === 1)!;

    const formulas = getRelevantFormulas(moment().toDate(), salaryBudget);

    expect(formulas.length).toBe(1);

    expect(formulas[0].accountId).toBe(1);
    expect(formulas[0].expression).toEqual([num(1630)]);
  });

  it("getRelevantFormulas from non-zero current budget amount should return correct formulas", () => {
    const { budgets } = getDemoData();
    const gymBudget = budgets.find((b) => b.id === 8)!;

    const formulas = getRelevantFormulas(
      moment().add(-1, "M").toDate(),
      gymBudget
    );

    expect(formulas.length).toBe(1);

    expect(formulas[0].accountId).toBe(1);
    expect(formulas[0].expression).toEqual([num(119)]);
  });

  it("getRelevantFormulas from zero budget amount should return correct formulas", () => {
    const { budgets } = getDemoData();
    const sportBudget = budgets.find((b) => b.id === 7)!;

    const formulas = getRelevantFormulas(moment().toDate(), sportBudget);

    expect(formulas.length).toBe(1);

    expect(formulas[0].accountId).toBe(1);
    expect(formulas[0].expression).toEqual([num(0)]);
  });

  it("getRelevantFormulas from zero current budget amount should return correct formulas", () => {
    const { budgets } = getDemoData();
    const gymBudget = budgets.find((b) => b.id === 8)!;

    const formulas = getRelevantFormulas(moment().toDate(), gymBudget);

    expect(formulas.length).toBe(1);

    expect(formulas[0].accountId).toBe(1);
    expect(formulas[0].expression).toEqual([num(0)]);
  });

  it("getUserTotals should return correct totals and sub-totals", () => {
    const month = moment();
    const { accounts } = getDemoData();
    const calculatedPairs: BudgetPair[] = [
      new BudgetPair(1, 1, month, BudgetTypeUser.income, 100, 101, []),
      new BudgetPair(2, 1, month, BudgetTypeUser.income, 102, 103, []),
      new BudgetPair(1, 2, month, BudgetTypeUser.income, 104, 105, []),
    ];
    const relevantFormulas: RelevantFormula[] = [];

    const totals = getUserTotals(
      month,
      accounts,
      calculatedPairs,
      relevantFormulas
    );

    expect(totals).toHaveLength(28);

    for (const budgetType of userTypes) {
      const totalsOfType = totals.filter(
        (x) =>
          x.budgetId === 0 && x.accountId === 0 && x.budgetType === budgetType
      );
      expect(totalsOfType).toHaveLength(1);

      for (const account of accounts) {
        const subTotalsOfType = totals.filter(
          (x) =>
            x.budgetId === 0 &&
            x.accountId === account.id &&
            x.budgetType === budgetType
        );
        expect(subTotalsOfType).toHaveLength(1);
      }
    }

    const account1IncomeTotal = totals.find(
      (x) =>
        x.budgetId === 0 &&
        x.accountId === 1 &&
        x.budgetType === BudgetTypeUser.income
    );
    expect(account1IncomeTotal!.planned).toBe(202);
    expect(account1IncomeTotal!.actual).toBe(204);

    const account2IncomeTotal = totals.find(
      (x) =>
        x.budgetId === 0 &&
        x.accountId === 2 &&
        x.budgetType === BudgetTypeUser.income
    );
    expect(account2IncomeTotal!.planned).toBe(104);
    expect(account2IncomeTotal!.actual).toBe(105);

    const account3IncomeTotal = totals.find(
      (x) =>
        x.budgetId === 0 &&
        x.accountId === 3 &&
        x.budgetType === BudgetTypeUser.income
    );
    expect(account3IncomeTotal!.planned).toBe(0);
    expect(account3IncomeTotal!.actual).toBe(0);

    const totalIncome = totals.find(
      (x) =>
        x.budgetId === 0 &&
        x.accountId === 0 &&
        x.budgetType === BudgetTypeUser.income
    );
    expect(totalIncome!.planned).toBe(306);
    expect(totalIncome!.actual).toBe(309);
  });

  it.each([
    {
      month: moment().add(-1, "M"),
      planned: 20,
      actual: 10,
      isClosed: true,
      result: 10,
    },
    {
      month: moment().add(-1, "M"),
      planned: 20,
      actual: 10,
      isClosed: undefined,
      result: 10,
    },
    {
      month: moment().add(-1, "M"),
      planned: 20,
      actual: 10,
      isClosed: false,
      result: 10,
    },
    {
      month: moment().add(-1, "M"),
      planned: 10,
      actual: 20,
      isClosed: true,
      result: 20,
    },
    {
      month: moment().add(-1, "M"),
      planned: 10,
      actual: 20,
      isClosed: undefined,
      result: 20,
    },
    {
      month: moment().add(-1, "M"),
      planned: 10,
      actual: 20,
      isClosed: false,
      result: 20,
    },
    {
      month: moment(),
      planned: 20,
      actual: 10,
      isClosed: true,
      result: 10,
    },
    {
      month: moment(),
      planned: 20,
      actual: 10,
      isClosed: undefined,
      result: 20,
    },
    {
      month: moment(),
      planned: 20,
      actual: 10,
      isClosed: false,
      result: 20,
    },
    {
      month: moment().add(1, "M"),
      planned: 20,
      actual: 10,
      isClosed: true,
      result: 10,
    },
    {
      month: moment().add(1, "M"),
      planned: 20,
      actual: 10,
      isClosed: undefined,
      result: 20,
    },
    {
      month: moment().add(1, "M"),
      planned: 20,
      actual: 10,
      isClosed: false,
      result: 20,
    },
  ])("getEstimation should return correct estimation", (params: any) => {
    const estimation = getEstimation(
      params.month,
      params.planned,
      params.actual,
      params.isClosed
    );
    expect(estimation).toBe(params.result);
  });

  it.each([
    {
      accountId: 1,
      result: 84.7,
    },
    {
      accountId: 2,
      result: 66.8,
    },
    {
      accountId: 3,
      result: 40,
    },
    {
      accountId: undefined,
      result: 191.5,
    },
  ])(
    "calculateForNextMonth pairs from previous month should return correct amount",
    (params: any) => {
      const { budgets, accounts, statements } = getDemoData();
      const prevMontMoment = moment().add(-1, "M");
      const budgetPairs = buildBudgetPairsForMonth(
        prevMontMoment,
        budgets,
        statements,
        accounts,
        []
      );
      const flatPairs = flattenBudgetPairs(budgetPairs.list);

      const amount = calculateForNextMonth(flatPairs, params.accountId);

      expect(amount).toBe(params.result);
    }
  );

  it.each([
    {
      accountId: 1,
      result: 27.2,
    },
    {
      accountId: 2,
      result: 66.8,
    },
    {
      accountId: 3,
      result: 40,
    },
    {
      accountId: undefined,
      result: 134,
    },
  ])(
    "calculateForNextMonth pairs from current month should return correct amount",
    (params: any) => {
      const { budgets, accounts, statements } = getDemoData();
      const prevMontMoment = moment().add(-1, "M");
      const budgetPairsFromPrevMonth = buildBudgetPairsForMonth(
        prevMontMoment,
        budgets,
        statements,
        accounts,
        []
      );
      const curMonthMoment = moment();
      const budgetPairs = buildBudgetPairsForMonth(
        curMonthMoment,
        budgets,
        statements,
        accounts,
        budgetPairsFromPrevMonth.list
      );
      const flatPairs = flattenBudgetPairs(budgetPairs.list);

      const amount = calculateForNextMonth(flatPairs, params.accountId);

      expect(amount).toBe(params.result);
    }
  );

  it.each<{ tokens: AmountToken[]; result: number }>([
    { tokens: [num(0)], result: 0 },
    { tokens: [num(123)], result: 123 },
    { tokens: [{ kind: "daysInMonth" }], result: 30 },
    { tokens: [{ kind: "daysInMonth", prevMonth: true }], result: 31 },
    { tokens: [{ kind: "weekdays", weekday: 0 }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 1 }], result: 5 },
    { tokens: [{ kind: "weekdays", weekday: 2 }], result: 5 },
    { tokens: [{ kind: "weekdays", weekday: 3 }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 4 }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 5 }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 6 }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 0, prevMonth: true }], result: 5 },
    { tokens: [{ kind: "weekdays", weekday: 1, prevMonth: true }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 2, prevMonth: true }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 3, prevMonth: true }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 4, prevMonth: true }], result: 4 },
    { tokens: [{ kind: "weekdays", weekday: 5, prevMonth: true }], result: 5 },
    { tokens: [{ kind: "weekdays", weekday: 6, prevMonth: true }], result: 5 },
    // previous month values of a month that wasn't built count as 0
    { tokens: [{ kind: "budget", budgetId: 1, prevMonth: true }], result: 0 },
    {
      tokens: [{ kind: "total", budgetType: BudgetTypeUser.income }],
      result: 0,
    },
  ])("calculate without data should return correct result", (params) => {
    const currentMonth = moment().year(2024).month(3);
    const amount = evaluateExpression(
      params.tokens,
      new Calculate(currentMonth, []),
      new Calculate(currentMonth.clone().add(-1, "M"), [])
    );

    expect(amount).toBe(params.result);
  });

  it.each([
    {
      token: { kind: "budget", budgetId: 15, prevMonth: true },
      result: 250,
    },
    {
      token: { kind: "budget", budgetId: 4 },
      result: 60,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.income },
      result: 1630,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.income, accountId: 1 },
      result: 1630,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.income, accountId: 2 },
      result: 0,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.income, accountId: 3 },
      result: 0,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.savings },
      result: 355.7,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.savings,
        accountId: 1,
      },
      result: 355.7,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.savings,
        accountId: 2,
      },
      result: 0,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.savings,
        accountId: 3,
      },
      result: 0,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.loanReturn },
      result: 480,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.loanReturn,
        accountId: 1,
      },
      result: 480,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.loanReturn,
        accountId: 2,
      },
      result: 0,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.loanReturn,
        accountId: 3,
      },
      result: 0,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.spending },
      result: 879,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.spending,
        accountId: 1,
      },
      result: 149,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.spending,
        accountId: 2,
      },
      result: 560,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.spending,
        accountId: 3,
      },
      result: 170,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.keepOnAccount },
      result: 0,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.keepOnAccount,
        accountId: 1,
      },
      result: 0,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.keepOnAccount,
        accountId: 2,
      },
      result: 0,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.keepOnAccount,
        accountId: 3,
      },
      result: 0,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeUser.transferToAccount },
      result: 900,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.transferToAccount,
        accountId: 1,
      },
      result: 730,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.transferToAccount,
        accountId: 2,
      },
      result: 170,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeUser.transferToAccount,
        accountId: 3,
      },
      result: 0,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeExtra.transferFromAccount },
      result: 900,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.transferFromAccount,
        accountId: 1,
      },
      result: 0,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.transferFromAccount,
        accountId: 2,
      },
      result: 730,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.transferFromAccount,
        accountId: 3,
      },
      result: 170,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeExtra.leftFromPrevMonth },
      result: 191.5,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.leftFromPrevMonth,
        accountId: 1,
      },
      result: 84.7,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.leftFromPrevMonth,
        accountId: 2,
      },
      result: 66.8,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.leftFromPrevMonth,
        accountId: 3,
      },
      result: 40,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeExtra.openingBalance },
      result: 2721.5,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.openingBalance,
        accountId: 1,
      },
      result: 1714.7,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.openingBalance,
        accountId: 2,
      },
      result: 796.8,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.openingBalance,
        accountId: 3,
      },
      result: 210,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeExtra.closingBalance },
      result: 106.8,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.closingBalance,
        accountId: 1,
      },
      result: 0,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.closingBalance,
        accountId: 2,
      },
      result: 66.8,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.closingBalance,
        accountId: 3,
      },
      result: 40,
    },
    {
      token: { kind: "total", budgetType: BudgetTypeExtra.monthDelta },
      result: -84.7,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.monthDelta,
        accountId: 1,
      },
      result: 645.3,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.monthDelta,
        accountId: 2,
      },
      result: -560,
    },
    {
      token: {
        kind: "total",
        budgetType: BudgetTypeExtra.monthDelta,
        accountId: 3,
      },
      result: -170,
    },
  ])("calculate with data should return correct result", (params: any) => {
    const { budgets, accounts, statements } = getDemoData();
    const currentMonth = moment();
    const prevMonth = moment().add(-1, "M");

    const prevMonthBudgetPairs = buildBudgetPairsForMonth(
      prevMonth,
      budgets,
      statements,
      accounts,
      []
    );
    const curMonthBudgetPairs = buildBudgetPairsForMonth(
      currentMonth,
      budgets,
      statements,
      accounts,
      prevMonthBudgetPairs.list
    );

    const amount = evaluateExpression(
      [params.token],
      new Calculate(currentMonth, flattenBudgetPairs(curMonthBudgetPairs.list)),
      new Calculate(prevMonth, flattenBudgetPairs(prevMonthBudgetPairs.list))
    );

    expect(amount).toBe(params.result);
  });
});
