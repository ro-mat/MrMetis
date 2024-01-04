import React, { FC, useMemo } from "react";
import TableCellPair from "./TableCellPair";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { BudgetTypeExtra } from "store/userdata/userdata.types";

interface ITableRowMonthDeltaProps {
  budgetPairArray: BudgetPairArray;
}

const TableRowMonthDelta: FC<ITableRowMonthDeltaProps> = ({
  budgetPairArray,
}) => {
  const { t } = useTranslation();
  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

  return (
    budgetPairArray.list && (
      <>
        <tr>
          <td colSpan={months.length * 2 + 1}>&nbsp;</td>
        </tr>
        <tr>
          <td>
            <strong>{t("planning.monthDelta")}</strong>
          </td>
          {months.map((month, index) => (
            <React.Fragment key={index}>
              <TableCellPair
                pair={budgetPairArray.getTotalPair(
                  [BudgetTypeExtra.monthDelta],
                  month
                )}
                isStrong={true}
                moreIsGood={true}
              />
            </React.Fragment>
          ))}
        </tr>
      </>
    )
  );
};

export default TableRowMonthDelta;
