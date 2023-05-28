import { FC } from "react";
import TableCellPair from "./TableCellPair";
import { BudgetTypeUser, IBudget } from "store/userdata/userdata.types";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { getById } from "helpers/userdata";
import React from "react";
import { BudgetItems } from "types/BudgetItems";

export interface ITableRowsFromPrevMonthProps {
  accountId: number;
  activeBudgets: IBudget[];
  budgetItems: BudgetItems[];
}

const TableRowsTransferToAccount: FC<ITableRowsFromPrevMonthProps> = ({
  accountId,
  activeBudgets,
  budgetItems,
}) => {
  const { accounts } = useSelector((state: AppState) => state.data.userdata);

  const filteredActiveBudgets = activeBudgets.filter(
    (b) =>
      b.type === BudgetTypeUser.transferToAccount && b.toAccountId === accountId
  );
  return (
    <>
      {filteredActiveBudgets.length > 0 &&
        filteredActiveBudgets.map((b) => (
          <tr>
            <td>From {getById(accounts, b.fromAccountId)?.name}</td>
            {budgetItems.map((bm, index) => {
              return (
                <React.Fragment key={index}>
                  <TableCellPair
                    valuePlanned={bm.totalToOtherAccount.planned}
                    valueActual={bm.totalToOtherAccount.actual}
                    show={
                      bm.totalToOtherAccount &&
                      (bm.totalToOtherAccount.planned > 0 ||
                        bm.totalToOtherAccount.actual > 0)
                    }
                    moreIsGood={true}
                  />
                </React.Fragment>
              );
            })}
          </tr>
        ))}
    </>
  );
};

export default TableRowsTransferToAccount;
