import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { BudgetMonth } from "types/BudgetMonth";
import useBudgetAggregate from "./useBudgetAggregate";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
} from "store/userdata/userdata.types";
import { isActive, toActiveBudget } from "types/BudgetItems";
import { range } from "helpers/arrayHelper";
import { getById } from "helpers/userdata";
import { getRelevantAmount } from "helpers/budgetHelper";
import {
  RelevantFormula,
  getEstimation,
  getRelevantFormulas,
} from "services/budgetCalculator";
import { calculate } from "helpers/evalHelper";
import { BudgetPair, BudgetStatement } from "services/budgetBuilder";

export const useBudget = (start: number, end: number) => {
  const relativeMonths = range(start, end);
  const {
    budgets: budgetList,
    statements: statementList,
    accounts: accountList,
  } = useSelector((state: AppState) => state.data.userdata);

  const beforeFirstMonth = moment().add(start - 1, "M");

  let { budgetMonth: prevMonth } = useBudgetAggregate(
    beforeFirstMonth.toDate()
  );

  const activeBudgets: IActiveBudget[] = [];

  const budgetMonths = relativeMonths.map((rm) => {
    const budget = new BudgetMonth(
      moment().add(rm, "M").toDate(),
      budgetList,
      statementList,
      accountList,
      prevMonth
    );

    prevMonth = budget;

    const activeItems = budget.list.filter((i) => isActive(i));
    activeItems.forEach((item) => {
      if (!activeBudgets.find((ab) => ab.budgetId === item.id)) {
        activeBudgets.push(toActiveBudget(item));
        if (item.type === BudgetTypeUser.transferToAccount) {
          activeBudgets.push(
            toActiveBudget(
              item,
              BudgetTypeExtra.transferFromAccount,
              item.budget.toAccountId,
              getById(accountList, item.budget.fromAccountId)?.name
            )
          );
        }
      }
    });

    return budget;
  });

  return { budgetMonths, activeBudgets };
};

export default useBudget;

export interface IActiveBudget {
  budgetId: number;
  type: BudgetType;
  name: string;
  accountId: number;
  children: IActiveBudget[];
}
