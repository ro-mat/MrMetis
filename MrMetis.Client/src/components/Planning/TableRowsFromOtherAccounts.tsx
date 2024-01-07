import { FC } from "react";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import TableRow from "./TableRow";
import { useTranslation } from "react-i18next";
import { Moment } from "moment";
import { BudgetPairArray } from "services/budgetBuilder";
import useBudget from "hooks/useBudget";

export interface ITableRowsFromPrevMonthProps {
  months: Moment[];
  budgetPairArray: BudgetPairArray;
  accountId?: number;

  highlight?: boolean;
}

const TableRowsFromOtherAccounts: FC<ITableRowsFromPrevMonthProps> = ({
  months,
  budgetPairArray,
  accountId,
  highlight = false,
}) => {
  const { t } = useTranslation();

  const { budgets } = useBudget();

  const filteredBudgets = budgets.filter(
    (b) =>
      b.type === BudgetTypeUser.transferToAccount &&
      b.toAccountId === accountId &&
      budgetPairArray.isBudgetActive(b.id, accountId)
  );

  return (
    <>
      {filteredBudgets.map((ab) => (
        <TableRow
          key={ab.id}
          budget={ab}
          months={months}
          budgetPairArray={budgetPairArray}
          moreIsGood={true}
          highlight={highlight}
          accountId={accountId}
        />
      ))}
    </>
  );
};

export default TableRowsFromOtherAccounts;
