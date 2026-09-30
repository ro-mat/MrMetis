import moment from "moment";
import { useCallback, useMemo } from "react";
import { flattenBudgetPairs } from "helpers/budgetMapper";
import { calculate, Calculate } from "services/budgetFormula";
import useBudgetCalculate from "./useBudgetCalculate";

// Evaluates a budget amount formula for the current month, against the saved
// data (unsaved form changes aren't part of it).
// Returns the value, an error message, or undefined while there's no data
// (or it's not `enabled`, then nothing is calculated).
const useFormulaPreview = (enabled: boolean) => {
  const { budgetPairArray, isReady } = useBudgetCalculate(-1, 0, enabled);

  const context = useMemo(() => {
    if (!isReady || !enabled) return undefined;

    const curMonth = moment();
    const prevMonth = moment().add(-1, "M");
    const pairs = flattenBudgetPairs(budgetPairArray.list);
    return {
      cur: new Calculate(
        curMonth,
        pairs.filter((p) => p.month.isSame(curMonth, "M"))
      ),
      prev: new Calculate(
        prevMonth,
        pairs.filter((p) => p.month.isSame(prevMonth, "M"))
      ),
    };
  }, [budgetPairArray, isReady, enabled]);

  return useCallback(
    (formula: string) =>
      context && formula.trim()
        ? calculate(formula, context.cur, context.prev)
        : undefined,
    [context]
  );
};

export default useFormulaPreview;
