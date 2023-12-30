import { getDemoData, initDemoData } from "helpers/demoHelper";
import moment from "moment";
import { getRelevantFormulas } from "services/budgetCalculator";

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
});
