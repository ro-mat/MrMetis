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
  budgetMonths: BudgetMonth[];
  activeBudgets: IActiveBudget[];
}

const AccountsTableBody: FC<IAccountsTableBodyProps> = ({
  accountId,
  budgetMonths,
  activeBudgets,
}) => {
  const { t } = useTranslation();

  const accountBudgetMonths = budgetMonths.map((bm) => {
    return bm.budgetMonthAccounts.get(accountId)!;
  });

  const activeAccountBudgets = useMemo(() => {
    return activeBudgets.filter((b) => b.accountId === accountId);
  }, [activeBudgets, accountId]);

  return (
    <>
      <TableRowsFromPrevMonth budgetItems={accountBudgetMonths} />
      <TableRowsFromOtherAccounts
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
      />
      <TableRowsByType
        types={[BudgetTypeUser.income]}
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        moreIsGood={true}
        showTotal={false}
      />
      <TableRowsOpeningBalance budgetItems={accountBudgetMonths} />
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
      />
      <TableRowsByType
        types={[BudgetTypeUser.keepOnAccount]}
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        moreIsGood={true}
        showTotal={false}
      />
      <TableRowsByType
        types={[BudgetTypeUser.transferToAccount]}
        activeBudgets={activeAccountBudgets}
        budgetItems={accountBudgetMonths}
        moreIsGood={true}
        showTotal={false}
      />
      <TableRowsClosingBalance budgetItems={accountBudgetMonths} />
    </>
  );
};

export default AccountsTableBody;
