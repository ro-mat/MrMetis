import { BudgetPair } from "services/budgetBuilder";

export const flattenBudgetPairs = (arr: BudgetPair[]) => {
  const res: BudgetPair[] = [];
  for (const item of arr) {
    res.push(item);

    flattenBudgetPairs(item.children).forEach((c) => res.push(c));
  }

  return res;
};
