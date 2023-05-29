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
    const mom = moment().add(rm, "M");
    const budget = new BudgetMonth(
      mom.toDate(),
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
