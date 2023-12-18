import { FC } from "react";
import { BudgetItems } from "types/BudgetItems";
import { BudgetTypeExtra } from "store/userdata/userdata.types";
import TableRow from "./TableRow";
import { IActiveBudget } from "hooks/useBudget";
import { useTranslation } from "react-i18next";

export interface ITableRowsFromPrevMonthProps {
  activeBudgets: IActiveBudget[];
  budgetItems: BudgetItems[];
  highlight?: boolean;
}

const TableRowsFromOtherAccounts: FC<ITableRowsFromPrevMonthProps> = ({
  activeBudgets,
  budgetItems,
  highlight = false,
}) => {
  const { t } = useTranslation();

  const filteredActiveBudgets = activeBudgets.filter(
    (ab) => ab.type === BudgetTypeExtra.transferFromAccount
  );
  const filteredBudgetItems = budgetItems.map((bi) => {
    const items = new BudgetItems(
      bi.month,
      bi.list.filter((l) => l.type === BudgetTypeExtra.transferFromAccount)
    );
    items.trySetTotal(undefined, false);
    return items;
  });
  return (
    <>
      {filteredActiveBudgets.map((ab) => (
        <TableRow
          key={ab.budgetId}
          budgetId={ab.budgetId}
          name={`${t("planning.sentFrom")} ${ab.name}`}
          budgetItems={filteredBudgetItems}
          moreIsGood={true}
          children={ab.children}
          highlight={highlight}
        />
      ))}
    </>
  );
};

export default TableRowsFromOtherAccounts;
