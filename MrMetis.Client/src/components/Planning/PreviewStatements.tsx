import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { Button, EditButton } from "components/ui";
import { DATE_FORMAT } from "helpers/dateHelper";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BudgetStatement } from "services/budgetPair";
import { TAppDispatch } from "store/store";
import { SET_PREVIEW_STATEMENTS } from "store/ui/ui.slice";

interface IPreviewStatementsProps {
  statements: BudgetStatement[];
  // 0 for totals, which have no budget to edit
  budgetId?: number;
}

// Opened and closed by clicking its cell, see TableCellPair.
const PreviewStatements = ({
  statements,
  budgetId,
}: IPreviewStatementsProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const navigate = useNavigate();

  // closed first, so it isn't still open when coming back
  const handleEdit = () => {
    dispatch(SET_PREVIEW_STATEMENTS(undefined));
    navigate(`/budget/${budgetId}`);
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
            {/* placeholder for closing / opening the budget */}
            <Button variant="plain" disabled>
              <FontAwesomeIcon icon={faLock} />
            </Button>
          </div>
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
                      <td>{moment(s.date).format(DATE_FORMAT)}</td>
                      <td className="amount">{s.amount.toFixed(2)}</td>
                      <td>{s.comment}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default PreviewStatements;
