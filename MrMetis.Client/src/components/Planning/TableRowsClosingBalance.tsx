import React from "react";
import TableCellPair from "./TableCellPair";
import { BudgetItems } from "types/BudgetItems";
import { useTranslation } from "react-i18next";

export interface ITableRowsClosingBalanceProps {
  budgetItems: BudgetItems[];
  highlight?: boolean;
}

const TableRowsClosingBalance = ({
  budgetItems,
  highlight = false,
}: ITableRowsClosingBalanceProps) => {
  const { t } = useTranslation();

  return (
    <tr className={highlight ? "highlight" : ""}>
      <td>
        <strong>{t("planning.closingBalance")}</strong>
      </td>
      {budgetItems.map((bm, index) => {
        return (
          <React.Fragment key={index}>
            <TableCellPair
              valuePlanned={bm.closingBalance?.planned ?? 0}
              valueActual={bm.closingBalance?.actual ?? 0}
              isStrong={true}
              moreIsGood={true}
            />
          </React.Fragment>
        );
      })}
    </tr>
  );
};

export default TableRowsClosingBalance;
