import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
} from "store/userdata/userdata.types";

export type BudgetClaculated = {
  budgetId: number;
  budgetType: BudgetType;
  planned: number;
  actual: number;
  estimation: number;
};

export const getEstimation = (
  planned: number,
  actual: number,
  expectOneStatement: boolean = true
) => {
  return (actual > 0 && actual > planned) || (expectOneStatement && actual > 0)
    ? actual
    : planned;
};

export const calculateForNextMonth = (
  budgetCalculatedArray: BudgetClaculated[]
) => {
  return budgetCalculatedArray.reduce((prev, cur) => {
    switch (cur.budgetType) {
      case BudgetTypeExtra.transferFromAccount:
      case BudgetTypeUser.income: {
        return prev + cur.estimation;
      }
      case BudgetTypeUser.transferToAccount:
      case BudgetTypeUser.loanReturn:
      case BudgetTypeUser.savings:
      case BudgetTypeUser.spending: {
        return prev - cur.estimation;
      }
      default: {
        return prev;
      }
    }
  }, 0);
};
