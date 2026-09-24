import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { range } from "helpers/arrayHelper";
import {
  BudgetPair,
  BudgetPairArray,
  buildBudgetPairsForMonth,
} from "services/budgetBuilder";
import { useMemo } from "react";

// Builds budget pairs for months [start, end] relative to the current month.
// Each month depends on the previous one, so the month before start is built too.
export const useBudgetCalculate = (start: number, end: number) => {
  const { budgets, statements, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const isReady = budgets.length > 0;

  const budgetPairArray = useMemo(() => {
    if (!isReady) return new BudgetPairArray([]);

    let prevMonthPairs = buildBudgetPairsForMonth(
      moment().add(start - 1, "M"),
      budgets,
      statements,
      accounts,
      []
    );

    const budgetPairs: BudgetPair[] = [];
    for (const relativeMonth of range(start, end)) {
      prevMonthPairs = buildBudgetPairsForMonth(
        moment().add(relativeMonth, "M"),
        budgets,
        statements,
        accounts,
        prevMonthPairs.list
      );
      budgetPairs.push(...prevMonthPairs.list);
    }

    return new BudgetPairArray(budgetPairs);
  }, [isReady, start, end, budgets, statements, accounts]);

  return { budgetPairArray, isReady };
};

export default useBudgetCalculate;
