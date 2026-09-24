import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";
import { useTranslation } from "react-i18next";
import useBudget from "hooks/useBudget";
import useAccount from "hooks/useAccount";
import { useMemo } from "react";
import { IStatement } from "store/userdata/userdata.types";

export interface INewStatementPreviewProps {
  statement: IStatement;
}

const NewStatementPreview = ({ statement }: INewStatementPreviewProps) => {
  const { t } = useTranslation();

  const { getById: getBudgetById } = useBudget();
  const { getById: getAccountById } = useAccount();

  const budgetName = useMemo(
    () => getBudgetById(statement.budgetId)?.name,
    [getBudgetById, statement]
  );
  const accountName = useMemo(
    () => getAccountById(statement.accountId)?.name,
    [getAccountById, statement]
  );

  return (
    <div>
      <span className={budgetName ?? "error"}>
        {t("quickAdd.budget")}: {budgetName ?? "N/A"}
      </span>
      ,{" "}
      <span className={accountName ?? "error"}>
        {t("quickAdd.account")}: {accountName ?? "N/A"}
      </span>
      ,{" "}
      <span>
        {t("quickAdd.date")}: {moment(statement.date).format(DATE_FORMAT)}
      </span>
      ,{" "}
      <span className={statement.amount === 0 ? "error" : ""}>
        {t("quickAdd.amount")}: {statement.amount.toFixed(2)}
      </span>
      ,{" "}
      <span>
        {t("quickAdd.comment")}: {statement.comment}
      </span>
    </div>
  );
};

export default NewStatementPreview;
