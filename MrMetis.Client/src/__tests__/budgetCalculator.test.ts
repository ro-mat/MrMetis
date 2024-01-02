import { flattenBudgetPairs } from "helpers/budgetMapper";
import { getDemoData, initDemoData } from "helpers/demoHelper";
import moment from "moment";
import { BudgetPair, buildBudgetPairsForMonth } from "services/budgetBuilder";
import {
  BudgetCalculatedList,
  Calculate,
  RelevantFormula,
  calculate,
  calculateForNextMonth,
  getEstimation,
  getRelevantFormulas,
  getUserTotals,
  userTypes,
} from "services/budgetCalculator";
import { BudgetTypeUser } from "store/userdata/userdata.types";

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
    expect(formulas[0].formula).toBe("1630");
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
    expect(formulas[0].formula).toBe("119");
  });

  it("getRelevantFormulas from zero budget amount should return correct formulas", () => {
    const { budgets } = getDemoData();
    const sportBudget = budgets.find((b) => b.id === 7)!;

    const formulas = getRelevantFormulas(moment().toDate(), sportBudget);

    expect(formulas.length).toBe(1);

    expect(formulas[0].accountId).toBe(1);
    expect(formulas[0].formula).toBe("0");
  });

  it("getRelevantFormulas from zero current budget amount should return correct formulas", () => {
    const { budgets } = getDemoData();
    const gymBudget = budgets.find((b) => b.id === 8)!;

    const formulas = getRelevantFormulas(moment().toDate(), gymBudget);

    expect(formulas.length).toBe(1);

    expect(formulas[0].accountId).toBe(1);
    expect(formulas[0].formula).toBe("0");
  });

  it("getUserTotals should return correct totals and sub-totals", () => {
    const month = moment();
    const { accounts } = getDemoData();
    const calculatedPairs: BudgetPair[] = [
      new BudgetPair(1, 1, month, BudgetTypeUser.income, 100, 101, true, []),
      new BudgetPair(2, 1, month, BudgetTypeUser.income, 102, 103, true, []),
      new BudgetPair(1, 2, month, BudgetTypeUser.income, 104, 105, true, []),
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
      expectOneStatement: true,
      result: 10,
    },
    {
      month: moment().add(-1, "M"),
      planned: 20,
      actual: 10,
      expectOneStatement: undefined,
      result: 10,
    },
    {
      month: moment().add(-1, "M"),
      planned: 20,
      actual: 10,
      expectOneStatement: false,
      result: 10,
    },
    {
      month: moment().add(-1, "M"),
      planned: 10,
      actual: 20,
      expectOneStatement: true,
      result: 20,
    },
    {
      month: moment().add(-1, "M"),
      planned: 10,
      actual: 20,
      expectOneStatement: undefined,
      result: 20,
    },
    {
      month: moment().add(-1, "M"),
      planned: 10,
      actual: 20,
      expectOneStatement: false,
      result: 20,
    },
    {
      month: moment(),
      planned: 20,
      actual: 10,
      expectOneStatement: true,
      result: 10,
    },
    {
      month: moment(),
      planned: 20,
      actual: 10,
      expectOneStatement: undefined,
      result: 10,
    },
    {
      month: moment(),
      planned: 20,
      actual: 10,
      expectOneStatement: false,
      result: 20,
    },
    {
      month: moment().add(1, "M"),
      planned: 20,
      actual: 10,
      expectOneStatement: true,
      result: 10,
    },
    {
      month: moment().add(1, "M"),
      planned: 20,
      actual: 10,
      expectOneStatement: undefined,
      result: 10,
    },
    {
      month: moment().add(1, "M"),
      planned: 20,
      actual: 10,
      expectOneStatement: false,
      result: 20,
    },
  ])("getEstimation should return correct estimation", (params: any) => {
    const estimation = getEstimation(
      params.month,
      params.planned,
      params.actual,
      params.expectOneStatement
    );
    expect(estimation).toBe(params.result);
  });

  it.each([
    {
      accountId: 1,
      result: 64.7,
    },
    {
      accountId: 2,
      result: 16.8,
    },
    {
      accountId: 3,
      result: 20,
    },
    {
      accountId: undefined,
      result: 101.5,
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
      result: 16.8,
    },
    {
      accountId: 3,
      result: 20,
    },
    {
      accountId: undefined,
      result: 64,
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

  it.each([
    {
      formula: "0",
      result: 0,
    },
    {
      formula: "123",
      result: 123,
    },
    {
      formula: "cur_month.getDaysInMonth()",
      result: 30,
    },
    {
      formula: "prev_month.getDaysInMonth()",
      result: 31,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(0)",
      result: "Day can only be from 1 to 7!",
    },
    {
      formula: "cur_month.getWeekdaysInMonth(1)",
      result: 5,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(2)",
      result: 5,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(3)",
      result: 4,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(4)",
      result: 4,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(5)",
      result: 4,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(6)",
      result: 4,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(7)",
      result: 4,
    },
    {
      formula: "cur_month.getWeekdaysInMonth(8)",
      result: "Day can only be from 1 to 7!",
    },
    {
      formula: "prev_month.getWeekdaysInMonth(0)",
      result: "Day can only be from 1 to 7!",
    },
    {
      formula: "prev_month.getWeekdaysInMonth(1)",
      result: 4,
    },
    {
      formula: "prev_month.getWeekdaysInMonth(2)",
      result: 4,
    },
    {
      formula: "prev_month.getWeekdaysInMonth(3)",
      result: 4,
    },
    {
      formula: "prev_month.getWeekdaysInMonth(4)",
      result: 4,
    },
    {
      formula: "prev_month.getWeekdaysInMonth(5)",
      result: 5,
    },
    {
      formula: "prev_month.getWeekdaysInMonth(6)",
      result: 5,
    },
    {
      formula: "prev_month.getWeekdaysInMonth(7)",
      result: 5,
    },
    {
      formula: "prev_month.getWeekdaysInMonth(8)",
      result: "Day can only be from 1 to 7!",
    },
  ])("calculate without data should return correct result", (params: any) => {
    const currentMonth = moment().year(2024).month(3);
    const amount = calculate(
      params.formula,
      new Calculate(currentMonth, new BudgetCalculatedList([])),
      new Calculate(
        currentMonth.clone().add(-1, "M"),
        new BudgetCalculatedList([])
      )
    );

    expect(amount).toBe(params.result);
  });

  it.each([
    {
      formula: "prev_month.getItem(15)",
      result: 250,
    },
    {
      formula: "cur_month.getItem(4)",
      result: 60,
    },
    {
      formula: "cur_month.getTotalIncome()",
      result: 1630,
    },
    {
      formula: "cur_month.getTotalIncome(1)",
      result: 1630,
    },
    {
      formula: "cur_month.getTotalIncome(2)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalIncome(3)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalSaving()",
      result: 445.7,
    },
    {
      formula: "cur_month.getTotalSaving(1)",
      result: 445.7,
    },
    {
      formula: "cur_month.getTotalSaving(2)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalSaving(3)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalLoanReturn()",
      result: 480,
    },
    {
      formula: "cur_month.getTotalLoanReturn(1)",
      result: 480,
    },
    {
      formula: "cur_month.getTotalLoanReturn(2)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalLoanReturn(3)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalSpending()",
      result: 769,
    },
    {
      formula: "cur_month.getTotalSpending(1)",
      result: 109,
    },
    {
      formula: "cur_month.getTotalSpending(2)",
      result: 510,
    },
    {
      formula: "cur_month.getTotalSpending(3)",
      result: 150,
    },
    {
      formula: "cur_month.getTotalKeepOnAccount()",
      result: 0,
    },
    {
      formula: "cur_month.getTotalKeepOnAccount(1)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalKeepOnAccount(2)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalKeepOnAccount(3)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalToOtherAccount()",
      result: 810,
    },
    {
      formula: "cur_month.getTotalToOtherAccount(1)",
      result: 660,
    },
    {
      formula: "cur_month.getTotalToOtherAccount(2)",
      result: 150,
    },
    {
      formula: "cur_month.getTotalToOtherAccount(3)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalFromOtherAccount()",
      result: 810,
    },
    {
      formula: "cur_month.getTotalFromOtherAccount(1)",
      result: 0,
    },
    {
      formula: "cur_month.getTotalFromOtherAccount(2)",
      result: 660,
    },
    {
      formula: "cur_month.getTotalFromOtherAccount(3)",
      result: 150,
    },
    {
      formula: "cur_month.getLeftFromPrevMonth()",
      result: 101.5,
    },
    {
      formula: "cur_month.getLeftFromPrevMonth(1)",
      result: 64.7,
    },
    {
      formula: "cur_month.getLeftFromPrevMonth(2)",
      result: 16.8,
    },
    {
      formula: "cur_month.getLeftFromPrevMonth(3)",
      result: 20,
    },
    {
      formula: "cur_month.getOpeningBalance()",
      result: 2541.5,
    },
    {
      formula: "cur_month.getOpeningBalance(1)",
      result: 1694.7,
    },
    {
      formula: "cur_month.getOpeningBalance(2)",
      result: 676.8,
    },
    {
      formula: "cur_month.getOpeningBalance(3)",
      result: 170,
    },
    {
      formula: "cur_month.getClosingBalance()",
      result: 36.8,
    },
    {
      formula: "cur_month.getClosingBalance(1)",
      result: 0,
    },
    {
      formula: "cur_month.getClosingBalance(2)",
      result: 16.8,
    },
    {
      formula: "cur_month.getClosingBalance(3)",
      result: 20,
    },
    {
      formula: "cur_month.getMonthDelta()",
      result: -64.7,
    },
    {
      formula: "cur_month.getMonthDelta(1)",
      result: 595.3,
    },
    {
      formula: "cur_month.getMonthDelta(2)",
      result: -510,
    },
    {
      formula: "cur_month.getMonthDelta(3)",
      result: -150,
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

    const amount = calculate(
      params.formula,
      new Calculate(
        currentMonth,
        new BudgetCalculatedList(flattenBudgetPairs(curMonthBudgetPairs.list))
      ),
      new Calculate(
        prevMonth,
        new BudgetCalculatedList(flattenBudgetPairs(prevMonthBudgetPairs.list))
      )
    );

    expect(amount).toBe(params.result);
  });
});
