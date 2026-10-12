import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";
import { Button, EditButton } from "components/ui";
import moment, { Moment } from "moment";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BudgetStatement } from "services/budgetPair";
import { TAppDispatch } from "store/store";
import { SET_PREVIEW_STATEMENTS } from "store/ui/ui.slice";
import { CLOSE_BUDGET, OPEN_BUDGET } from "store/userdata/userdata.slice";
import { DATE_FORMAT } from "helpers/dateHelper";
import useLocale from "hooks/useLocale";

interface IPreviewStatementsProps {
  statements: BudgetStatement[];
  // 0 for totals, which have no budget to edit or close
  budgetId?: number;
  month: Moment;
  // not set: every account
  accountId?: number;
  isClosed: boolean;
}

// Opened and closed by clicking its cell, see TableCellPair.
const PreviewStatements = ({
  statements,
  budgetId,
  month,
  accountId,
  isClosed,
}: IPreviewStatementsProps) => {
  const { t } = useTranslation();
  const { formatAmount, formatDate } = useLocale();
  const dispatch = useDispatch<TAppDispatch>();
  const navigate = useNavigate();

  // closed first, so it isn't still open when coming back
  const handleEdit = () => {
    dispatch(SET_PREVIEW_STATEMENTS(undefined));
    navigate(`/budget/${budgetId}`);
  };

  const handleToggleClosed = () => {
    const payload = {
      budgetId: budgetId!,
      month: month.format(DATE_FORMAT),
      accountId,
    };
    if (isClosed) {
      dispatch(OPEN_BUDGET(payload));
      return;
    }
    // nothing is left to do with a closed budget's statements
    dispatch(SET_PREVIEW_STATEMENTS(undefined));
    dispatch(CLOSE_BUDGET(payload));
  };

  return (
    <>
      {statements && (
        // clicks inside (e.g. scrolling the list) don't toggle the cell
        <div
          className="preview-statements"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="preview-toolbar">
            {!!budgetId && <EditButton onClick={handleEdit} />}
            {!!budgetId && (
              <Button
                variant="plain"
                title={t(isClosed ? "planning.openItem" : "planning.closeItem")}
                onClick={handleToggleClosed}
              >
                <FontAwesomeIcon icon={isClosed ? faLockOpen : faLock} />
              </Button>
            )}
          </div>
          {statements.length > 0 && (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>{t("statement.date")}</th>
                    <th className="amount">{t("statement.amount")}</th>
                    <th>{t("statement.comment")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...statements]
                    .sort((a, b) => moment(b.date).diff(moment(a.date)))
                    .map((s) => (
                      <tr key={s.id}>
                        <td>{formatDate(s.date)}</td>
                        <td className="amount">{formatAmount(s.amount)}</td>
                        <td>{s.comment}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PreviewStatements;
