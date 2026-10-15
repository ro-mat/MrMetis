import moment from "moment";
import { useCallback, useMemo } from "react";
import { flattenBudgetPairs } from "helpers/budgetMapper";
import { Calculate } from "services/budgetFormula";
import { evaluateExpression } from "services/amountExpression";
import { AmountToken } from "types/IAmount";
import useBudgetCalculate from "./useBudgetCalculate";

// Evaluates a budget amount expression for the current month, against the
// saved data (unsaved form changes aren't part of it).
// Returns the value, an error (i18n key), or undefined while there's no data
// (or it's not `enabled`, then nothing is calculated, or the saved budgets
// can't be calculated, then there's nothing to preview against).
const useFormulaPreview = (enabled: boolean) => {
  const { budgetPairArray, isReady, error } = useBudgetCalculate(
    -1,
    0,
    enabled
  );

  const context = useMemo(() => {
    if (!isReady || !enabled || error) return undefined;

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
  }, [budgetPairArray, isReady, enabled, error]);

  return useCallback(
    (expression: AmountToken[]) =>
      context
        ? evaluateExpression(expression, context.cur, context.prev)
        : undefined,
    [context]
  );
};

export default useFormulaPreview;
