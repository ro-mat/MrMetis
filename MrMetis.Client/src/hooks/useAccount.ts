import { useCallback } from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";

const useAccount = () => {
  const { accounts, budgets, statements } = useSelector(
    (state: AppState) => state.data.userdata
  );

  const getById = useCallback(
    (accountId?: number) => accounts.find((a) => a.id === accountId),
    [accounts]
  );

  const getNextId = useCallback(() => {
    const maxExistingId =
      accounts.length > 0 ? Math.max(...accounts.map((i) => i.id)) : 0;
    return maxExistingId + 1;
  }, [accounts]);

  const isAccountUsed = useCallback(
    (accountId: number) =>
      budgets.some(
        (b) => b.fromAccountId === accountId || b.toAccountId === accountId
      ) || statements.some((s) => s.accountId === accountId),
    [budgets, statements]
  );

  return { accounts, getById, getNextId, isAccountUsed };
};

export default useAccount;
