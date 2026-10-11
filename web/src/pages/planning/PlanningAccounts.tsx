import AccountsTableBody from "components/Planning/AccountsTableBody";
import TableHeader from "components/Planning/TableHeader";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { IPlanningProps } from "./Index";
import { useOutletContext } from "react-router-dom";
import { BudgetTypeExtra } from "store/userdata/userdata.types";
import TableRowsExtra from "components/Planning/TableRowsExtra";
import useAccount from "hooks/useAccount";

const PlanningAccounts = () => {
  const { months, budgetPairArray } = useOutletContext<IPlanningProps>();

  const { accounts } = useAccount();

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => [1, 2, 3].includes(a.id)),
    [accounts]
  );

  // account rows stick right under the header, so track its height
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [theadHeight, setTheadHeight] = useState<number>();
  useLayoutEffect(() => {
    const thead = theadRef.current;
    if (!thead || typeof ResizeObserver === "undefined") return;
    // round down: the header is drawn above the rows, so overlap beats a gap
    const observer = new ResizeObserver(() =>
      setTheadHeight(Math.floor(thead.getBoundingClientRect().height))
    );
    observer.observe(thead);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="planning-table">
        <table
          style={
            theadHeight === undefined
              ? undefined
              : ({
                  "--thead-height": `${theadHeight}px`,
                } as React.CSSProperties)
          }
        >
          <thead ref={theadRef}>
            <TableHeader months={months} />
          </thead>
          {filteredAccounts.map((a, index) => (
            <AccountsTableBody
              key={a.id}
              accountId={a.id}
              accountName={a.name}
              budgetPairArray={budgetPairArray}
              months={months}
              index={index}
            />
          ))}
          <tbody>
            <tr>
              <td colSpan={months.length * 2 + 1}>&nbsp;</td>
            </tr>
            <TableRowsExtra
              type={BudgetTypeExtra.monthDelta}
              budgetPairArray={budgetPairArray}
              months={months}
            />
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PlanningAccounts;
