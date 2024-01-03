import { FC, useMemo } from "react";
import TableCellPair from "./TableCellPair";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { BudgetTypeExtra } from "store/userdata/userdata.types";

export interface ITableRowsFromPrevMonthProps {
  budgetPairArray: BudgetPairArray;
  highlight?: boolean;
  accountId?: number;
}

const TableRowsFromPrevMonth: FC<ITableRowsFromPrevMonthProps> = ({
  budgetPairArray,
  highlight = false,
  accountId,
}) => {
  const { t } = useTranslation();
  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

  return (
    <tr className={highlight ? "highlight" : ""}>
      <td>{t("planning.leftFromPrevMonth")}</td>
      {months.map((month, index) => (
        <TableCellPair
          key={index}
          pair={budgetPairArray.getTotalPair(
            [BudgetTypeExtra.leftFromPrevMonth],
            month,
            accountId
          )}
          moreIsGood={true}
        />
      ))}
    </tr>
  );
};

export default TableRowsFromPrevMonth;
