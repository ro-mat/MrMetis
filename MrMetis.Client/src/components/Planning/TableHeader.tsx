import React, { FC } from "react";
import moment from "moment";
import { BudgetMonth } from "types/BudgetMonth";
import { useTranslation } from "react-i18next";

interface ITableHeaderProps {
  budgetMonths: BudgetMonth[];
}

const TableHeader: FC<ITableHeaderProps> = ({ budgetMonths }) => {
  const { t, i18n } = useTranslation();

  return (
    <>
      <tr>
        <th rowSpan={2}></th>
        {budgetMonths.map((bm, index) => (
          <th
            key={index}
            colSpan={2}
            className={`bl br ${
              moment(bm.month).isSame(moment(), "M") ? "current-month" : ""
            }`}
          >
            {moment(bm.month).locale(i18n.language).format("YYYY-MM (MMM)")}
          </th>
        ))}
      </tr>
      <tr>
        {budgetMonths.map((bm, index) => (
          <React.Fragment key={index}>
            <th
              className={`bl ${
                moment(bm.month).isSame(moment(), "M") ? "current-month" : ""
              }`}
            >
              {t("planning.planned")}
            </th>
            <th
              className={`br ${
                moment(bm.month).isSame(moment(), "M") ? "current-month" : ""
              }`}
            >
              {t("planning.actual")}
            </th>
          </React.Fragment>
        ))}
      </tr>
    </>
  );
};

export default TableHeader;
