import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useBudget from "./useBudget";
import useAccount from "./useAccount";
import { IStatement } from "store/userdata/userdata.types";

const useStatement = () => {
  const { statements } = useSelector((state: AppState) => state.data.userdata);
  const { getById: getBudgetById } = useBudget();
  const { getById: getAccountById } = useAccount();

  const getById = (statementId: number) => {
    return statements.find((b) => b.id === statementId);
  };

  const getNextId = () => {
    const maxExistingId =
      statements.length > 0 ? Math.max(...statements.map((i) => i.id)) : 0;
    return maxExistingId + 1;
  };

  const filter = (list: IStatement[], str: string) => {
    const normalizedStr = str.toLocaleLowerCase();
    return list.filter(
      (s) =>
        s.amount.toFixed(2).includes(normalizedStr) ||
        getBudgetById(s.budgetId)?.name.toLowerCase().includes(normalizedStr) ||
        getAccountById(s.accountId)
          ?.name.toLowerCase()
          .includes(normalizedStr) ||
        s.comment?.toLowerCase().includes(normalizedStr)
    );
  };

  const filtered = (str: string) => {
    return filter(statements, str);
  };

  return { statements, getById, getNextId, filter, filtered };
};

export default useStatement;
