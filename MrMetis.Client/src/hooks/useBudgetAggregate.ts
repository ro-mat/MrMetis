import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { BudgetMonth } from "types/BudgetMonth";

const useBudgetAggregate = (month: Date) => {
  const { budgets, statements, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );

  const budgetMonth = new BudgetMonth(month, budgets, statements, accounts);
  return { budgetMonth };
};

export default useBudgetAggregate;
