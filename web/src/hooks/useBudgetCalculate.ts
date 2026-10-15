import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import {
  BudgetCalculationError,
  buildBudgetPairsForMonths,
  ProblemFormula,
} from "services/budgetBuilder";
import { BudgetPairArray } from "services/budgetPairArray";
import { useMemo } from "react";

export type CalculateError = {
  message: string;
  problems: ProblemFormula[]; // empty when the failure isn't about formulas
};

// Builds budget pairs for months [start, end] relative to the current month.
// Each month depends on the previous one, so the month before start is built too.
// Nothing is built while not `enabled`.
// When the calculation fails (e.g. a broken formula) the result is empty and
// `error` describes it, so pages stay usable and the budgets can be fixed.
export const useBudgetCalculate = (
  start: number,
  end: number,
  enabled = true
) => {
  const { budgets, statements, accounts, closedMonths } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const isReady = budgets.length > 0;

  const { budgetPairArray, error } = useMemo((): {
    budgetPairArray: BudgetPairArray;
    error?: CalculateError;
  } => {
    if (!isReady || !enabled) return { budgetPairArray: new BudgetPairArray([]) };

    try {
      return {
        budgetPairArray: buildBudgetPairsForMonths(
          moment().add(start, "M"),
          moment().add(end, "M"),
          { budgets, statements, accounts, closedMonths }
        ),
      };
    } catch (e) {
      return {
        budgetPairArray: new BudgetPairArray([]),
        error: {
          message: e instanceof Error ? e.message : String(e),
          problems: e instanceof BudgetCalculationError ? e.problems : [],
        },
      };
    }
  }, [isReady, enabled, start, end, budgets, statements, accounts, closedMonths]);

  return { budgetPairArray, isReady, error };
};

export default useBudgetCalculate;
