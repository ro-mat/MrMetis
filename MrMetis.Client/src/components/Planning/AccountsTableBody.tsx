import React, { FC, useMemo } from "react";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";
import TableRowsByType from "./TableRowsByType";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import TableRowsExtra from "./TableRowsExtra";
import { Moment } from "moment";
import TableRowTotal from "./TableRowTotal";

export interface IAccountsTableBodyProps {
  accountId: number;
  accountName: string;
  budgetPairArray: BudgetPairArray;
  months: Moment[];
  index?: number;
}

const AccountsTableBody: FC<IAccountsTableBodyProps> = ({
  accountId,
  accountName,
  budgetPairArray,
  months,
  index,
}) => {
  const { t } = useTranslation();

  const isEven = useMemo(() => {
    return index === undefined ? false : index % 2 === 1;
  }, [index]);

  return (
    <>
      <tr className={`sticky${isEven ? " highlight" : ""}`}>
        <td colSpan={months.length * 2 + 1}>
          <strong>{accountName}</strong>
        </td>
      </tr>
      <TableRowsExtra
        type={BudgetTypeExtra.leftFromPrevMonth}
        budgetPairArray={budgetPairArray}
        months={months}
        highlight={isEven}
        accountId={accountId}
        isStrong={false}
      />
      <TableRowsByType
        type={BudgetTypeExtra.transferFromAccount}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        type={BudgetTypeUser.income}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsExtra
        type={BudgetTypeExtra.openingBalance}
        budgetPairArray={budgetPairArray}
        months={months}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        type={BudgetTypeUser.savings}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        type={BudgetTypeUser.loanReturn}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        type={BudgetTypeUser.spending}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowTotal
        types={[
          BudgetTypeUser.savings,
          BudgetTypeUser.loanReturn,
          BudgetTypeUser.spending,
        ]}
        months={months}
        budgetPairArray={budgetPairArray}
        highlight={isEven}
        totalLabel={t("planning.totalSpendings")}
        accountId={accountId}
      />
      <TableRowsByType
        type={BudgetTypeUser.keepOnAccount}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsByType
        type={BudgetTypeUser.transferToAccount}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        highlight={isEven}
        accountId={accountId}
      />
      <TableRowsExtra
        type={BudgetTypeExtra.closingBalance}
        budgetPairArray={budgetPairArray}
        months={months}
        highlight={isEven}
        accountId={accountId}
      />
    </>
  );
};

export default AccountsTableBody;
