import { BudgetPair } from "services/budgetBuilder";
import { BudgetCalculated } from "services/budgetCalculator";

export const mapToBudgetCalculated = (
  arr: BudgetPair[]
): BudgetCalculated[] => {
  return arr.map((a) => {
    return {
      budgetId: a.budgetId,
      budgetType: a.budgetType,
      accountId: a.accountId,
      planned: a.planned,
      actual: a.actual,
      expectOneStatement: a.expectOneStatement,
    };
  });
};

export const flattenBudgetPairs = (arr: BudgetPair[]) => {
  const res: BudgetPair[] = [];
  for (const item of arr) {
    res.push(item);

    flattenBudgetPairs(item.children).forEach((c) => res.push(c));
  }

  return res;
};
