import moment from "moment";
import { IStatement } from "store/userdata/userdata.types";
import { MouseEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EditButton, FilterInput } from "./ui";
import useBudget from "hooks/useBudget";
import useAccount from "hooks/useAccount";
import useStatement from "hooks/useStatement";
import useLocale from "hooks/useLocale";

export interface IStatementTableProps {
  statements: IStatement[];
  editButtonHandler?: (id: number) => void;
  topRows?: number; // show only this many rows at first; undefined shows all
  showMoreRows?: number; // rows revealed per "show more" click; defaults to topRows
}

const StatementTable = ({
  statements,
  editButtonHandler,
  topRows,
  showMoreRows = topRows,
}: IStatementTableProps) => {
  const { t } = useTranslation();
  const { formatAmount, formatDate } = useLocale();

  const { getById: getBudgetById } = useBudget();
  const { getById: getAccountById } = useAccount();
  const { filter: filterStatements } = useStatement();

  const [filter, setFilter] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(topRows);
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

  const visibleStatements =
    visibleCount === undefined
      ? filteredStatements
      : filteredStatements.slice(0, visibleCount);
  const hiddenCount = filteredStatements.length - visibleStatements.length;

  // links, not navigation: keep the "#" out of the url
  const showMore = (reveal: () => void) => (e: MouseEvent) => {
    e.preventDefault();
    reveal();
  };

  const onFilterChange = (value: string) => {
    setFilter(value);
    setVisibleCount(topRows);
  };

  return (
    <>
      <FilterInput
        label="statement.filter"
        value={filter}
        onChange={onFilterChange}
      />
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
          {visibleStatements.map((s) => (
            <tr key={s.id}>
              <td>{formatDate(s.date)}</td>
              <td>{formatAmount(s.amount)}</td>
              <td>{getBudgetById(s.budgetId)?.name}</td>
              <td>{getAccountById(s.accountId)?.name}</td>
              <td>{s.comment}</td>
              {editButtonHandler !== undefined && (
                <td>
                  <EditButton onClick={() => editButtonHandler(s.id)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {hiddenCount > 0 && (
        <div className="show-more">
          <a
            href="#"
            onClick={showMore(() =>
              setVisibleCount((c) => (c ?? 0) + (showMoreRows ?? 0))
            )}
          >
            {t("statement.showMore", {
              count: Math.min(showMoreRows ?? 0, hiddenCount),
            })}
          </a>
          <a href="#" onClick={showMore(() => setVisibleCount(undefined))}>
            {t("statement.showAll", { count: hiddenCount })}
          </a>
        </div>
      )}
    </>
  );
};

export default StatementTable;
