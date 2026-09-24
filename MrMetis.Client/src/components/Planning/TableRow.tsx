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
  onlyActive?: boolean;
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
  onlyActive = true,
  onlyRemaining = false,
  accountId,
}: ITableRowProps) => {
  const [showChildren, toggleShowChildren] = useToggle(false);
  const { getChildren: getBudgetChildren } = useBudget();

  if (onlyRemaining && !budgetPairArray.isBudgetRemaining(budget.id, accountId))
    return <></>;

  if (onlyActive && !budgetPairArray.isBudgetActive(budget.id, accountId))
    return <></>;

  const children = getBudgetChildren(budget.id);
  const filteredChildren = children.filter(
    (c) =>
      (onlyRemaining === false ||
        budgetPairArray.isBudgetRemaining(c.id, accountId)) &&
      (onlyActive === false || budgetPairArray.isBudgetActive(c.id, accountId))
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
                accountId={accountId}
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
            highlight={highlight}
          />
        ))}
    </>
  );
};

export default TableRow;
