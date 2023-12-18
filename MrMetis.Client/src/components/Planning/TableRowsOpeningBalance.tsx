import React from "react";
import TableCellPair from "./TableCellPair";
import { BudgetItems } from "types/BudgetItems";
import { useTranslation } from "react-i18next";

export interface ITableRowsOpeningBalanceProps {
  budgetItems: BudgetItems[];
  highlight?: boolean;
}

const TableRowsOpeningBalance = ({
  budgetItems,
  highlight = false,
}: ITableRowsOpeningBalanceProps) => {
  const { t } = useTranslation();

  return (
    <tr className={highlight ? "highlight" : ""}>
      <td>
        <strong>{t("planning.openingBalance")}</strong>
      </td>
      {budgetItems.map((bm, index) => (
        <TableCellPair
          key={index}
          valuePlanned={bm.openingBalance.planned}
          valueActual={bm.openingBalance.actual}
          isStrong={true}
          moreIsGood={true}
        />
      ))}
    </tr>
  );
};

export default TableRowsOpeningBalance;
