import React, { FC, useMemo } from "react";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";
import TableRowsByType from "./TableRowsByType";
import TableRowsFromPrevMonth from "./TableRowsFromPrevMonth";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import TableRowsExtra from "./TableRowsExtra";

export interface IAccountsTableBodyProps {
  accountId: number;
  accountName: string;
  budgetPairArray: BudgetPairArray;
  index?: number;
}

const AccountsTableBody: FC<IAccountsTableBodyProps> = ({
  accountId,
  accountName,
  budgetPairArray,
  index,
}) => {
  const { t } = useTranslation();

  const isEven = useMemo(() => {
    return index === undefined ? false : index % 2 === 1;
  }, [index]);

  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

  return (
    <>
      <tr className={`sticky${isEven ? " highlight" : ""}`}>
        <td colSpan={months.length * 2 + 1}>
          <strong>{accountName}</strong>
        </td>
      </tr>
      <TableRowsFromPrevMonth
        budgetPairArray={budgetPairArray}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        types={[BudgetTypeExtra.transferFromAccount]}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        types={[BudgetTypeUser.income]}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsExtra
        type={BudgetTypeExtra.openingBalance}
        budgetPairArray={budgetPairArray}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        types={[
          BudgetTypeUser.savings,
          BudgetTypeUser.loanReturn,
          BudgetTypeUser.spending,
        ]}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        showTotal={true}
        totalLabel={t("planning.totalSpendings")}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        types={[BudgetTypeUser.keepOnAccount]}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        types={[BudgetTypeUser.transferToAccount]}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsExtra
        type={BudgetTypeExtra.closingBalance}
        budgetPairArray={budgetPairArray}
        highlight={isEven}
        accountId={accountId}
      />
    </>
  );
};

export default AccountsTableBody;
