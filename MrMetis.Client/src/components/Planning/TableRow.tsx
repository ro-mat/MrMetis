import React from "react";
import TableCellPair from "./TableCellPair";
import { BudgetItems, IBudgetItem } from "types/BudgetItems";
import { IActiveBudget } from "hooks/useBudget";
import { range } from "helpers/arrayHelper";
import useToggle from "hooks/useToggle";
import { IStatement } from "store/userdata/userdata.types";

export interface ITableRowProps {
  budgetId: number;
  name: string;
  budgetItems: BudgetItems[];
  moreIsGood: boolean;
  children: IActiveBudget[];
  indent?: number;
  highlight?: boolean;
}

const TableRow = ({
  name,
  budgetId,
  budgetItems,
  moreIsGood,
  children,
  indent = 0,
  highlight = false,
}: ITableRowProps) => {
  const [showChildren, toggleShowChildren] = useToggle(false);

  const getItemStatements = (item?: IBudgetItem): IStatement[] => {
    if (!item) {
      return [];
    }
    const childStatements = !showChildren
      ? item.children.list.reduce(
          (prev: IStatement[], cur) => prev.concat(getItemStatements(cur)),
          []
        )
      : [];

    return [...item.statements, ...childStatements];
  };

  return (
    <>
      <tr className={highlight ? "highlight" : ""}>
        {children.length > 0 ? (
          <td className="has-children" onClick={toggleShowChildren}>
            {range(0, indent - 1).map(() => (
              <>&nbsp;&nbsp;&nbsp;&nbsp;</>
            ))}
            <span>{name}</span>
            <span className={`arrow ${showChildren ? "open" : ""}`}>{">"}</span>
          </td>
        ) : (
          <td>
            {range(0, indent - 1).map(() => (
              <>&nbsp;&nbsp;&nbsp;&nbsp;</>
            ))}
            {name}
          </td>
        )}
        {budgetItems.map((budgetItem, index) => {
          const item = budgetItem.getItem(budgetId);
          const childrenPlanned = item ? item.children.getTotalPlanned() : 0;
          const childrenActual = item ? item.children.getTotalActual() : 0;
          const show =
            item &&
            (item.planned !== 0 ||
              item.actual !== 0 ||
              childrenPlanned !== 0 ||
              childrenActual !== 0);
          return (
            <React.Fragment key={index}>
              <TableCellPair
                valuePlanned={
                  item
                    ? item.planned + (!showChildren ? childrenPlanned : 0)
                    : 0
                }
                valueActual={
                  item ? item.actual + (!showChildren ? childrenActual : 0) : 0
                }
                show={show}
                moreIsGood={moreIsGood}
                statements={getItemStatements(item)}
              />
            </React.Fragment>
          );
        })}
      </tr>
      {showChildren &&
        children.map((child) => (
          <TableRow
            key={child.budgetId}
            budgetId={child.budgetId}
            name={child.name}
            budgetItems={budgetItems}
            moreIsGood={moreIsGood}
            children={child.children}
            indent={indent + 1}
          />
        ))}
    </>
  );
};

export default TableRow;
