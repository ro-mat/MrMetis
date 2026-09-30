import { DATE_FORMAT } from "helpers/dateHelper";
import moment from "moment";
import React from "react";
import { BudgetStatement } from "services/budgetPair";

interface IPreviewStatementsProps {
  statements: BudgetStatement[];
}

// Opened and closed by clicking its cell, see TableCellPair.
const PreviewStatements = ({ statements }: IPreviewStatementsProps) => {
  return (
    <>
      {statements && (
        // clicks inside (e.g. scrolling the list) don't toggle the cell
        <div
          className="preview-statements"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {[...statements]
              .sort((a, b) => moment(b.date).diff(moment(a.date)))
              .map((s) => (
                <div key={s.id}>
                  <div>
                    {moment(s.date).format(DATE_FORMAT)} {s.amount.toFixed(2)}
                  </div>
                  <div>{s.comment}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
};

export default PreviewStatements;
