import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useBudget from "./useBudget";
import useAccount from "./useAccount";
import { IStatement } from "store/userdata/userdata.types";
import { useCallback } from "react";
import useLocale from "./useLocale";

const useStatement = () => {
  const { statements } = useSelector((state: AppState) => state.data.userdata);
  const { getById: getBudgetById } = useBudget();
  const { getById: getAccountById } = useAccount();
  const { formatAmount } = useLocale();

  const getById = useCallback(
    (statementId?: number) => statements.find((b) => b.id === statementId),
    [statements]
  );

  const filter = useCallback(
    (list: IStatement[], str: string) => {
      const normalizedStr = str.toLocaleLowerCase();
      return list.filter(
        (s) =>
          formatAmount(s.amount).toLowerCase().includes(normalizedStr) ||
          getBudgetById(s.budgetId)
            ?.name.toLowerCase()
            .includes(normalizedStr) ||
          getAccountById(s.accountId)
            ?.name.toLowerCase()
            .includes(normalizedStr) ||
          s.comment?.toLowerCase().includes(normalizedStr)
      );
    },
    [getAccountById, getBudgetById, formatAmount]
  );

  const filtered = useCallback(
    (str: string) => {
      return filter(statements, str);
    },
    [statements, filter]
  );

  return { statements, getById, filter, filtered };
};

export default useStatement;
