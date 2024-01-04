import React from "react";
import TableCellPair from "./TableCellPair";
import { range } from "helpers/arrayHelper";
import useToggle from "hooks/useToggle";
import { IBudget } from "store/userdata/userdata.types";
import { BudgetPairArray } from "services/budgetBuilder";
import useBudget from "hooks/useBudget";
import { Moment } from "moment";

export interface ITableRowProps {
  budget: IBudget;
  months: Moment[];
  budgetPairArray: BudgetPairArray;
  moreIsGood: boolean;
  indent?: number;
  highlight?: boolean;
  onlyRemaining?: boolean;
  accountId?: number;
}

const TableRow = ({
  budget,
  budgetPairArray,
  months,
  moreIsGood,
  indent = 0,
  highlight = false,
  onlyRemaining = false,
  accountId,
}: ITableRowProps) => {
  const [showChildren, toggleShowChildren] = useToggle(false);
  const { getBudgetChildren } = useBudget();

  if (onlyRemaining && !budgetPairArray.isBudgetRemaining(budget.id))
    return <></>;

  const children = getBudgetChildren(budget.id);
  const filteredChildren = children.filter(
    (c) => onlyRemaining === false || budgetPairArray.isBudgetRemaining(c.id)
  );

  return (
    <>
      <tr className={highlight ? "highlight" : ""}>
        {filteredChildren.length > 0 ? (
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
                includeChildren={filteredChildren.length > 0 && !showChildren}
              />
            </React.Fragment>
          );
        })}
      </tr>
      {showChildren &&
        filteredChildren.map((child) => (
          <TableRow
            key={child.id}
            budget={child}
            months={months}
            budgetPairArray={budgetPairArray}
            moreIsGood={moreIsGood}
            indent={indent + 1}
            accountId={accountId}
            onlyRemaining={onlyRemaining}
          />
        ))}
    </>
  );
};

export default TableRow;
