import React, { useMemo } from "react";
import TableCellPair from "./TableCellPair";
import { IBudgetItem } from "types/BudgetItems";
import { range } from "helpers/arrayHelper";
import useToggle from "hooks/useToggle";
import { IBudget, IStatement } from "store/userdata/userdata.types";
import { BudgetPairArray } from "services/budgetBuilder";
import useBudget from "hooks/useBudget";

export interface ITableRowProps {
  budget: IBudget;
  budgetPairArray: BudgetPairArray;
  moreIsGood: boolean;
  indent?: number;
  highlight?: boolean;
  accountId?: number;
}

const TableRow = ({
  budget,
  budgetPairArray,
  moreIsGood,
  indent = 0,
  highlight = false,
  accountId,
}: ITableRowProps) => {
  const [showChildren, toggleShowChildren] = useToggle(false);
  const { getBudgetChildren } = useBudget();
  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

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

  const children = getBudgetChildren(budget.id);

  return (
    <>
      <tr className={highlight ? "highlight" : ""}>
        {children.length > 0 ? (
          <td className="has-children" onClick={toggleShowChildren}>
            {range(0, indent - 1).map(() => (
              <>&nbsp;&nbsp;&nbsp;&nbsp;</>
            ))}
            <span>{budget.name}</span>
            <span className={`arrow ${showChildren ? "open" : ""}`}>{">"}</span>
          </td>
        ) : (
          <td>
            {range(0, indent - 1).map(() => (
              <>&nbsp;&nbsp;&nbsp;&nbsp;</>
            ))}
            {budget.name}
          </td>
        )}
        {months.map((month, index) => {
          return (
            <React.Fragment key={index}>
              <TableCellPair
                pair={
                  budgetPairArray.getBudgetPair(budget.id, month, accountId)!
                }
                moreIsGood={moreIsGood}
                includeChildren={!showChildren}
              />
            </React.Fragment>
          );
        })}
      </tr>
      {showChildren &&
        children.map((child) => (
          <TableRow
            key={child.id}
            budget={child}
            budgetPairArray={budgetPairArray}
            moreIsGood={moreIsGood}
            indent={indent + 1}
            accountId={accountId}
          />
        ))}
    </>
  );
};

export default TableRow;
