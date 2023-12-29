import { getDemoData, initDemoData } from "helpers/demoHelper";
import moment from "moment";
import { buildBudgetPairsForMonth } from "services/budgetBuilder";

describe("budgetBuilder", () => {
  beforeEach(() => {
    initDemoData();
  });

  it("should be nice", () => {
    const { budgets, statements, accounts } = getDemoData();
    const prevMonthBudgetPairs = buildBudgetPairsForMonth(
      moment().add(-1, "M"),
      budgets,
      statements,
      accounts,
      []
    );
    const budgetPairs = buildBudgetPairsForMonth(
      moment(),
      budgets,
      statements,
      accounts,
      prevMonthBudgetPairs.list
    );

    expect(budgetPairs.list.length).toBe(4);
  });
});
