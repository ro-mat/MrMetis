import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import moment from "moment";
import { IStatement } from "store/userdata/userdata.types";
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DATE_FORMAT } from "helpers/dateHelper";
import Labeled from "./Labeled";
import useBudget from "hooks/useBudget";
import useAccount from "hooks/useAccount";
import useStatement from "hooks/useStatement";

export interface IStatementTableProps {
  statements: IStatement[];
  editButtonHandler?: (id: number) => void;
}

const StatementTable = ({
  statements,
  editButtonHandler,
}: IStatementTableProps) => {
  const { t } = useTranslation();

  const { getById: getBudgetById } = useBudget();
  const { getById: getAccountById } = useAccount();
  const { filter: filterStatements } = useStatement();

  const [filter, setFilter] = useState<string>("");
  const filteredStatements = useMemo(() => {
    return [...filterStatements(statements, filter)].sort((a, b) => {
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
  }, [filter, statements, filterStatements]);

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
              <td>{getBudgetById(s.budgetId)?.name}</td>
              <td>{getAccountById(s.accountId)?.name}</td>
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
