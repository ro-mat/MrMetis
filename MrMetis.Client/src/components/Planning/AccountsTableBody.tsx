import React, { FC, useMemo } from "react";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import TableRowsByType from "./TableRowsByType";
import TableRowsFromPrevMonth from "./TableRowsFromPrevMonth";
import TableRowsOpeningBalance from "./TableRowsOpeningBalance";
import TableRowsClosingBalance from "./TableRowsClosingBalance";
import { BudgetMonth } from "types/BudgetMonth";
import TableRowsFromOtherAccounts from "./TableRowsFromOtherAccounts";
import { IActiveBudget } from "hooks/useBudget";
import { useTranslation } from "react-i18next";

export interface IAccountsTableBodyProps {
  accountId: number;
  accountName: string;
  budgetMonths: BudgetMonth[];
  activeBudgets: IActiveBudget[];
  index?: number;
}

const AccountsTableBody: FC<IAccountsTableBodyProps> = ({
  accountId,
  accountName,
  budgetMonths,
  activeBudgets,
  index,
}) => {
  const { t } = useTranslation();

  const isEven = useMemo(() => {
    return index === undefined ? false : index % 2 === 1;
  }, [index]);

  const accountBudgetMonths = budgetMonths.map((bm) => {
    return bm.budgetMonthAccounts.get(accountId)!;
  });

  const activeAccountBudgets = useMemo(() => {
    return activeBudgets.filter((b) => b.accountId === accountId);
  }, [activeBudgets, accountId]);

  return (
    <>
      <tr className={`sticky${isEven ? " highlight" : ""}`}>
        <td colSpan={budgetMonths.length * 2 + 1}>
          <strong>{accountName}</strong>
        </td>
      </tr>
      <TableRowsFromPrevMonth
        budgetItems={accountBudgetMonths}
        highlight={isEven}
      />
      <TableRowsFromOtherAccounts
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        highlight={isEven}
      />
      <TableRowsByType
        types={[BudgetTypeUser.income]}
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        moreIsGood={true}
        showTotal={false}
        highlight={isEven}
      />
      <TableRowsOpeningBalance
        budgetItems={accountBudgetMonths}
        highlight={isEven}
      />
      <TableRowsByType
        types={[
          BudgetTypeUser.savings,
          BudgetTypeUser.loanReturn,
          BudgetTypeUser.spending,
        ]}
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        moreIsGood={false}
        totalLabel={t("planning.totalSpendings")}
        highlight={isEven}
      />
      <TableRowsByType
        types={[BudgetTypeUser.keepOnAccount]}
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        moreIsGood={true}
        showTotal={false}
        highlight={isEven}
      />
      <TableRowsByType
        types={[BudgetTypeUser.transferToAccount]}
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        moreIsGood={true}
        showTotal={false}
        highlight={isEven}
      />
      <TableRowsClosingBalance
        budgetItems={accountBudgetMonths}
        highlight={isEven}
      />
    </>
  );
};

export default AccountsTableBody;
