import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useAccount from "./useAccount";
import { BudgetTypeUser } from "store/userdata/userdata.types";

const useBudget = () => {
  const { budgets } = useSelector((state: AppState) => state.data.userdata);
  const { getById: getAccountById } = useAccount();

  const getById = (budgetId?: number) => {
    return budgets.find((b) => b.id === budgetId);
  };

  const getChildren = (budgetId: number) => {
    return budgets.filter((b) => b.parentId === budgetId);
  };

  const filtered = (str: string) => {
    const normalizedStr = str.toLocaleLowerCase();
    return budgets.filter(
      (b) =>
        b.id.toString().includes(normalizedStr) ||
        b.name.toLowerCase().includes(normalizedStr) ||
        BudgetTypeUser[b.type].toLowerCase().includes(normalizedStr) ||
        getById(b.parentId)?.name.toLowerCase().includes(normalizedStr) ||
        getAccountById(b.fromAccountId)
          ?.name.toLowerCase()
          .includes(normalizedStr) ||
        getAccountById(b.toAccountId)
          ?.name.toLowerCase()
          .includes(normalizedStr)
    );
  };

  return { budgets, getById, getChildren, filtered };
};

export default useBudget;
