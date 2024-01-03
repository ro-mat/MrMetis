import React, { FC } from "react";
import moment, { Moment } from "moment";
import { useTranslation } from "react-i18next";

interface ITableHeaderProps {
  months: Moment[];
}

const TableHeader: FC<ITableHeaderProps> = ({ months }) => {
  const { t, i18n } = useTranslation();

  return (
    <>
      <tr>
        <th></th>
        {months.map((month, index) => (
          <th
            key={index}
            colSpan={2}
            className={`bl br ${
              month.isSame(moment(), "M") ? "current-month" : ""
            }`}
          >
            {month.locale(i18n.language).format("YYYY-MM (MMM)")}
          </th>
        ))}
      </tr>
      <tr>
        <th></th>
        {months.map((month, index) => (
          <React.Fragment key={index}>
            <th
              className={`bl ${
                moment(month).isSame(moment(), "M") ? "current-month" : ""
              }`}
            >
              {t("planning.planned")}
            </th>
            <th
              className={`br ${
                moment(month).isSame(moment(), "M") ? "current-month" : ""
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
