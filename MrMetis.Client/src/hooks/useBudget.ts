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
import { IBudgetItem } from "types/BudgetItems";
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

const isActive = (budgetItem: IBudgetItem): boolean => {
  return (
    budgetItem.actual > 0 ||
    budgetItem.planned > 0 ||
    budgetItem.children.list.reduce((prev: boolean, cur) => {
      return prev || isActive(cur);
    }, false)
  );
};

const toActiveBudget = (
  budgetItem: IBudgetItem,
  type?: BudgetType,
  accountId?: number,
  name?: string
): IActiveBudget => {
  return {
    budgetId: budgetItem.id,
    type: type ?? budgetItem.type,
    name: name ?? budgetItem.name,
    accountId: accountId ?? budgetItem.budget.fromAccountId,
    children: budgetItem.children.list.map((child) =>
      toActiveBudget(child, type, accountId)
    ),
  };
};

export default useBudget;

export interface IActiveBudget {
  budgetId: number;
  type: BudgetType;
  name: string;
  accountId: number;
  children: IActiveBudget[];
}
