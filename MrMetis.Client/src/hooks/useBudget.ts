import { useSelector } from "react-redux";
import { AppState } from "store/store";

const useBudget = () => {
  const { budgets } = useSelector((state: AppState) => state.data.userdata);

  const getBudgetById = (id: number) => {
    return budgets.find((b) => b.id === id);
  };

  const getBudgetChildren = (budgetId: number) => {
    return budgets.filter((b) => b.parentId === budgetId);
  };

  return { getBudgetById, getBudgetChildren };
};

export default useBudget;
