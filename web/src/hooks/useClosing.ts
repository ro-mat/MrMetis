import { useCallback } from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { IStatement } from "store/userdata/userdata.types";
import { isStatementLocked } from "services/budgetClosing";

const useClosing = () => {
  const { budgets, closedMonths } = useSelector(
    (state: AppState) => state.data.userdata
  );

  // the statement is in a closed budget or month, so it can't be added or changed
  const isLocked = useCallback(
    (statement: Pick<IStatement, "budgetId" | "accountId" | "date">) =>
      isStatementLocked({ budgets, closedMonths }, statement),
    [budgets, closedMonths]
  );

  return { isLocked };
};

export default useClosing;
