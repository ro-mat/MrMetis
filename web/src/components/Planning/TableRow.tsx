import React from "react";
import TableCellPair from "./TableCellPair";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import useToggle from "hooks/useToggle";
import { IBudget } from "store/userdata/userdata.types";
import { BudgetPairArray } from "services/budgetPairArray";
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
  const hasChildren = filteredChildren.length > 0;

  return (
    <>
      <tr className={highlight ? "highlight" : ""}>
        <td
          className={`name-cell${hasChildren ? " has-children" : ""}`}
          style={{ paddingLeft: `calc(${indent} * 1em + 1.75em)` }}
          onClick={hasChildren ? toggleShowChildren : undefined}
        >
          {hasChildren && (
            <FontAwesomeIcon
              icon={faChevronRight}
              className={`toggle-icon${showChildren ? " open" : ""}`}
              style={{ left: `calc(${indent} * 1em + 0.5em)` }}
            />
          )}
          {budget.name}
        </td>
        {months.map((month, index) => {
          return (
            <React.Fragment key={index}>
              <TableCellPair
                pair={
                  budgetPairArray.getBudgetPair(budget.id, month, accountId)
                }
                moreIsGood={moreIsGood}
                includeChildren={hasChildren && !showChildren}
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
