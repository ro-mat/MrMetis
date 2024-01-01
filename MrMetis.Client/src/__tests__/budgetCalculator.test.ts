import { getDemoData, initDemoData } from "helpers/demoHelper";
import moment from "moment";
import { BudgetPair } from "services/budgetBuilder";
import {
  RelevantFormula,
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
});
