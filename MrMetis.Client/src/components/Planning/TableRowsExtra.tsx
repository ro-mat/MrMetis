import { FC, useMemo } from "react";
import TableCellPair from "./TableCellPair";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { BudgetTypeExtra } from "store/userdata/userdata.types";
import { Moment } from "moment";

export interface ITableRowsExtraProps {
  type: BudgetTypeExtra;
  budgetPairArray: BudgetPairArray;
  months: Moment[];
  isStrong?: boolean;
  highlight?: boolean;
  accountId?: number;
}

const TableRowsExtra: FC<ITableRowsExtraProps> = ({
  type,
  budgetPairArray,
  months,
  isStrong = true,
  highlight = false,
  accountId,
}) => {
  const { t } = useTranslation();

  return (
    <tr className={highlight ? "highlight" : ""}>
      <td>
        {isStrong ? (
          <strong>{t(`planning.${BudgetTypeExtra[type]}`)}</strong>
        ) : (
          t(`planning.${BudgetTypeExtra[type]}`)
        )}
      </td>
      {months.map((month, index) => (
        <TableCellPair
          key={index}
          pair={budgetPairArray.getTotalPair([type], month, accountId)}
          moreIsGood={true}
          isStrong={isStrong}
        />
      ))}
    </tr>
  );
};

export default TableRowsExtra;
