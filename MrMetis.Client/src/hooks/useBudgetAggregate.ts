import { getBudgetAggregate } from "helpers/budgetHelper";
import { getById } from "helpers/userdata";
import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import {
  BudgetTypeExtra,
  BudgetTypeUser,
  IBudget,
} from "store/userdata/userdata.types";
import { isActive, toActiveBudget } from "types/BudgetItems";

const useBudgetAggregate = (month: Date, tryBudget?: IBudget) => {
  const { budgets, statements, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );

  const budgetList =
    tryBudget === undefined
      ? [...budgets]
      : budgets.map((b) => (tryBudget.id === b.id ? tryBudget : b));

  let startingMonth = new Date();
  for (let budget of budgets) {
    for (let amount of budget.amounts) {
      if (moment(amount.startDate).isBefore(startingMonth)) {
        startingMonth = amount.startDate;
      }
    }
  }

  const budgetMonth = getBudgetAggregate(
    month,
    budgetList,
    statements,
    accounts,
    startingMonth
  )!;

  const activeBudgets = budgetMonth.list
    .filter((i) => isActive(i))
    .map((item) => toActiveBudget(item));
  const transferToList = budgetMonth.list.filter(
    (l) => l.type === BudgetTypeUser.transferToAccount
  );
  for (let transferToItem of transferToList) {
    activeBudgets.push(
      toActiveBudget(
        transferToItem,
        BudgetTypeExtra.transferFromAccount,
        transferToItem.budget.toAccountId,
        getById(accounts, transferToItem.budget.fromAccountId)?.name
      )
    );
  }

  return { budgetMonth, activeBudgets };
};

export default useBudgetAggregate;
