import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { BudgetType } from "store/userdata/userdata.types";
import { range } from "helpers/arrayHelper";
import {
  BudgetPair,
  BudgetPairArray,
  buildBudgetPairsForMonth,
} from "services/budgetBuilder";
import { useMemo } from "react";

export const useBudgetCalculate = (start: number, end: number) => {
  const relativeMonths = range(start, end);
  const { budgets, statements, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const isReady = useMemo(() => budgets.length > 0, [budgets]);

  const beforeFirstMonth = moment().add(start - 1, "M");
  let prevMonthBudgetPairs = buildBudgetPairsForMonth(
    beforeFirstMonth,
    budgets,
    statements,
    accounts,
    []
  );

  const budgetPairs = relativeMonths.reduce((prev: BudgetPair[], rm) => {
    prevMonthBudgetPairs = buildBudgetPairsForMonth(
      moment().add(rm, "M"),
      budgets,
      statements,
      accounts,
      prevMonthBudgetPairs.list
    );

    return [...prev, ...prevMonthBudgetPairs.list];
  }, []);

  const budgetPairArray = new BudgetPairArray(budgetPairs);

  return { budgetPairArray, isReady };
};

export default useBudgetCalculate;

export interface IActiveBudget {
  budgetId: number;
  type: BudgetType;
  name: string;
  accountId: number;
  children: IActiveBudget[];
}
