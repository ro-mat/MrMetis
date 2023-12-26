import React, { FC } from "react";
import { BudgetType, BudgetTypeUser } from "store/userdata/userdata.types";
import TableRow from "./TableRow";
import TableCellPair from "./TableCellPair";
import { BudgetItems } from "types/BudgetItems";
import { IActiveBudget } from "hooks/useBudget";
import { useTranslation } from "react-i18next";

export interface ITableRowsByTypeProps {
  types: BudgetType[];
  activeBudgets: IActiveBudget[];
  budgetItems: BudgetItems[];
  moreIsGood: boolean;
  totalLabel?: string;
  showTotal?: boolean;
  highlight?: boolean;
}

const TableRowsByType: FC<ITableRowsByTypeProps> = ({
  types,
  activeBudgets,
  budgetItems,
  moreIsGood,
  totalLabel,
  showTotal = true,
  highlight = false,
}) => {
  const { t } = useTranslation();

  const filteredActiveBudgets = activeBudgets.filter((b) =>
    types.includes(b.type)
  );
  return (
    <>
      {filteredActiveBudgets.length > 0 && (
        <>
          {filteredActiveBudgets.map((b) => (
            <TableRow
              key={b.budgetId}
              budgetId={b.budgetId}
              name={b.name}
              budgetItems={budgetItems}
              moreIsGood={moreIsGood}
              children={b.children}
              highlight={highlight}
            />
          ))}
          {showTotal && (
            <tr className={highlight ? "highlight" : ""}>
              <td>
                <strong>
                  {totalLabel ??
                    `${t("planning.total")} ${t(
                      `budgetType.${BudgetTypeUser[types[0]]}`
                    )}`}
                </strong>
              </td>
              {budgetItems.map((bm, index) => {
                const typeTotal = bm.filterByTypes(types);
                const hasIncome = types.includes(BudgetTypeUser.income);
                return (
                  <React.Fragment key={index}>
                    <TableCellPair
                      valuePlanned={typeTotal.getTotalPlanned()}
                      valueActual={typeTotal.getTotalActual()}
                      isStrong={true}
                      moreIsGood={hasIncome}
                    />
                  </React.Fragment>
                );
              })}
            </tr>
          )}
        </>
      )}
    </>
  );
};

export default TableRowsByType;
