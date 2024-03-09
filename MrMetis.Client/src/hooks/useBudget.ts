import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useAccount from "./useAccount";
import { BudgetTypeUser, IBudget } from "store/userdata/userdata.types";
import { useCallback } from "react";

const useBudget = () => {
  const { budgets, statements } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { getById: getAccountById } = useAccount();

  const getById = useCallback(
    (budgetId?: number) => {
      return budgets.find((b) => b.id === budgetId);
    },
    [budgets]
  );

  const getNextId = useCallback(() => {
    const maxExistingId =
      budgets.length > 0 ? Math.max(...budgets.map((i) => i.id)) : 0;
    return maxExistingId + 1;
  }, [budgets]);

  const getChildren = useCallback(
    (budgetId: number) => {
      return budgets.filter((b) => b.parentId === budgetId);
    },
    [budgets]
  );

  const filter = useCallback(
    (list: IBudget[], str: string) => {
      const normalizedStr = str.toLocaleLowerCase();
      return list.filter(
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
    },
    [getAccountById, getById]
  );

  const filtered = useCallback(
    (str: string) => filter(budgets, str),
    [budgets, filter]
  );

  const isBudgetUsed = useCallback(
    (budgetId: number) =>
      budgets.some((b) => b.parentId === budgetId) ||
      statements.some((s) => s.budgetId === budgetId),
    [budgets, statements]
  );

  return { budgets, getById, getNextId, getChildren, filtered, isBudgetUsed };
};

export default useBudget;
