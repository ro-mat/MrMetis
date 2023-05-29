import { getBudgetAggregate } from "helpers/budgetHelper";
import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { IBudget } from "store/userdata/userdata.types";

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

  return getBudgetAggregate(
    month,
    budgetList,
    statements,
    accounts,
    startingMonth
  );
};

export default useBudgetAggregate;
