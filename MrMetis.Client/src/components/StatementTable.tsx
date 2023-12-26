import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getById } from "helpers/userdata";
import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { IStatement } from "store/userdata/userdata.types";
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DATE_FORMAT } from "helpers/dateHelper";
import Labeled from "./Labeled";

export interface IStatementTableProps {
  statements: IStatement[];
  editButtonHandler?: (id: number) => void;
}

const StatementTable = ({
  statements,
  editButtonHandler,
}: IStatementTableProps) => {
  const { t } = useTranslation();

  const { budgets, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );

  const [filter, setFilter] = useState<string>("");
  const filteredStatements = useMemo(() => {
    return [...statements]
      .filter(
        (s) =>
          s.amount.toFixed(2).includes(filter.toLowerCase()) ||
          getById(budgets, s.budgetId)
            ?.name.toLowerCase()
            .includes(filter.toLowerCase()) ||
          getById(accounts, s.accountId)
            ?.name.toLowerCase()
            .includes(filter.toLowerCase()) ||
          s.comment?.toLowerCase().includes(filter.toLowerCase())
      )
      .sort((a, b) => {
        const aMom = moment(a.date);
        const bMom = moment(b.date);
        if (aMom.isAfter(bMom, "D")) {
          return -1;
        }
        if (aMom.isBefore(bMom, "D")) {
          return 1;
        }

        if (a.id > b.id) {
          return -1;
        }
        if (a.id < b.id) {
          return 1;
        }
        return 0;
      });
  }, [statements, budgets, filter, accounts]);

  return (
    <>
      <div className="filter-text">
        <Labeled labelKey="statement.filter" horisontal={true}>
          <input
            type="text"
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value)}
          />
        </Labeled>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t("statement.date")}</th>
            <th>{t("statement.amount")}</th>
            <th>{t("statement.budget")}</th>
            <th>{t("statement.account")}</th>
            <th>{t("statement.comment")}</th>
            {editButtonHandler !== undefined && <th>&nbsp;</th>}
          </tr>
        </thead>
        <tbody>
          {filteredStatements.map((s) => (
            <tr key={s.id}>
              <td>{moment(s.date).format(DATE_FORMAT)}</td>
              <td>{s.amount.toFixed(2)}</td>
              <td>{getById(budgets, s.budgetId)?.name}</td>
              <td>{getById(accounts, s.accountId)?.name}</td>
              <td>{s.comment}</td>
              {editButtonHandler !== undefined && (
                <td>
                  <button
                    type="button"
                    className="small"
                    onClick={() => editButtonHandler(s.id)}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default StatementTable;
