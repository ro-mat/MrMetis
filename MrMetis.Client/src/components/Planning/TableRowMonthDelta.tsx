import React, { FC } from "react";
import { BudgetMonth } from "types/BudgetMonth";
import TableCellPair from "./TableCellPair";
import { useTranslation } from "react-i18next";

interface ITableRowMonthDeltaProps {
  budgetMonths: BudgetMonth[];
}

const TableRowMonthDelta: FC<ITableRowMonthDeltaProps> = ({ budgetMonths }) => {
  const { t } = useTranslation();

  return (
    <>
      <tr>
        <td colSpan={budgetMonths.length * 2 + 1}>&nbsp;</td>
      </tr>
      <tr>
        <td>
          <strong>{t("planning.monthDelta")}</strong>
        </td>
        {budgetMonths.map((bm, index) => (
          <React.Fragment key={index}>
            <TableCellPair
              valuePlanned={bm.monthDelta?.planned ?? 0}
              valueActual={bm.monthDelta?.actual ?? 0}
              isStrong={true}
              moreIsGood={true}
            />
          </React.Fragment>
        ))}
      </tr>
    </>
  );
};

export default TableRowMonthDelta;
