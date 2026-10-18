import { useTranslation } from "react-i18next";
import useBudget from "hooks/useBudget";
import useAccount from "hooks/useAccount";
import moment from "moment";
import { IStatement } from "store/userdata/userdata.types";
import useLocale from "hooks/useLocale";
import { cx } from "components/ui/cx";

export interface INewStatementPreviewProps {
  statement: IStatement;
  // the statement with the highlighted suggestion applied; what it changes is
  // shown (marked as changed) instead
  preview?: IStatement;
}

const NewStatementPreview = ({
  statement,
  preview,
}: INewStatementPreviewProps) => {
  const { t } = useTranslation();
  const { formatAmount, formatDate } = useLocale();

  const { getById: getBudgetById } = useBudget();
  const { getById: getAccountById } = useAccount();

  const shown = preview ?? statement;
  const changed = {
    budget: shown.budgetId !== statement.budgetId,
    account: shown.accountId !== statement.accountId,
    date: !moment(shown.date).isSame(moment(statement.date), "d"),
    amount: shown.amount !== statement.amount,
    comment: (shown.comment ?? "") !== (statement.comment ?? ""),
  };

  const budgetName = getBudgetById(shown.budgetId)?.name;
  const accountName = getAccountById(shown.accountId)?.name;

  return (
    <div className="statement-preview">
      <span
        className={cx(!budgetName && "error", changed.budget && "changed")}
      >
        {t("quickAdd.budget")}: {budgetName ?? "N/A"}
      </span>
      ,{" "}
      <span
        className={cx(!accountName && "error", changed.account && "changed")}
      >
        {t("quickAdd.account")}: {accountName ?? "N/A"}
      </span>
      ,{" "}
      <span className={cx(changed.date && "changed")}>
        {t("quickAdd.date")}: {formatDate(shown.date)}
      </span>
      ,{" "}
      <span
        className={cx(shown.amount === 0 && "error", changed.amount && "changed")}
      >
        {t("quickAdd.amount")}: {formatAmount(shown.amount)}
      </span>
      ,{" "}
      <span className={cx(changed.comment && "changed")}>
        {t("quickAdd.comment")}: {shown.comment}
      </span>
    </div>
  );
};

export default NewStatementPreview;
