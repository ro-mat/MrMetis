import React, { FC } from "react";
import moment, { Moment } from "moment";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";
import { formatInLanguage, DATE_FORMAT } from "helpers/dateHelper";
import useLocale from "hooks/useLocale";
import { AppState, TAppDispatch } from "store/store";
import { CLOSE_MONTH, OPEN_MONTH } from "store/userdata/userdata.slice";
import { BudgetPairArray } from "services/budgetPairArray";
import { getLeftForNextMonth, isMonthClosed } from "services/budgetClosing";
import { Button } from "components/ui";

interface ITableHeaderProps {
  months: Moment[];
  budgetPairArray: BudgetPairArray;
}

const TableHeader: FC<ITableHeaderProps> = ({ months, budgetPairArray }) => {
  const { t } = useTranslation();
  const { formatMonth } = useLocale();
  const dispatch = useDispatch<TAppDispatch>();
  const { accounts, closedMonths } = useSelector(
    (state: AppState) => state.data.userdata
  );

  const monthClass = (month: Moment) =>
    `${month.isSame(moment(), "M") ? "current-month" : ""}${
      isMonthClosed(closedMonths, month) ? " closed" : ""
    }`;

  // closing stores what is really left as the next month's left from prev month
  const toggleMonth = (month: Moment) => {
    if (isMonthClosed(closedMonths, month)) {
      dispatch(OPEN_MONTH(month.format(DATE_FORMAT)));
      return;
    }
    dispatch(
      CLOSE_MONTH({
        month: month.format(DATE_FORMAT),
        left: getLeftForNextMonth(budgetPairArray, accounts, month),
      })
    );
  };

  return (
    <>
      <tr>
        <th></th>
        {months.map((month, index) => {
          const isClosed = isMonthClosed(closedMonths, month);
          return (
            <th
              key={index}
              colSpan={2}
              className={`bl br ${monthClass(month)}`}
            >
              {`${formatMonth(month)} (${formatInLanguage(month, "MMM")})`}
              {/* future months can't be closed yet */}
              {(isClosed || !month.isAfter(moment(), "M")) && (
                <Button
                  variant="plain"
                  className="ml-1"
                  title={t(
                    isClosed ? "planning.openMonth" : "planning.closeMonth"
                  )}
                  onClick={() => toggleMonth(month)}
                >
                  <FontAwesomeIcon icon={isClosed ? faLockOpen : faLock} />
                </Button>
              )}
            </th>
          );
        })}
      </tr>
      <tr>
        <th></th>
        {months.map((month, index) => (
          <React.Fragment key={index}>
            <th className={`bl ${monthClass(month)}`}>
              {t("planning.planned")}
            </th>
            <th className={`br ${monthClass(month)}`}>
              {t("planning.actual")}
            </th>
          </React.Fragment>
        ))}
      </tr>
    </>
  );
};

export default TableHeader;
