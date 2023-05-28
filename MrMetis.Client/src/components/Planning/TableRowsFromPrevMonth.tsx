import { FC } from "react";
import TableCellPair from "./TableCellPair";
import { BudgetItems } from "types/BudgetItems";
import { useTranslation } from "react-i18next";

export interface ITableRowsFromPrevMonthProps {
  budgetItems: BudgetItems[];
}

const TableRowsFromPrevMonth: FC<ITableRowsFromPrevMonthProps> = ({
  budgetItems,
}) => {
  const { t } = useTranslation();

  return (
    <tr>
      <td>{t("planning.leftFromPrevMonth")}</td>
      {budgetItems.map((bm, index) => (
        <TableCellPair
          key={index}
          valuePlanned={bm.leftFromPrevMonth.planned}
          valueActual={bm.leftFromPrevMonth.actual}
          moreIsGood={true}
        />
      ))}
    </tr>
  );
};

export default TableRowsFromPrevMonth;
