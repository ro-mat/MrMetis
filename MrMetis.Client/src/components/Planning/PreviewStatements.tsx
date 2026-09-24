import { DATE_FORMAT } from "helpers/dateHelper";
import moment from "moment";
import React from "react";
import { useDispatch } from "react-redux";
import { BudgetStatement } from "services/budgetBuilder";
import { TAppDispatch } from "store/store";
import { SET_PREVIEW_STATEMENTS } from "store/ui/ui.slice";
import { CloseButton } from "components/ui";

interface IPreviewStatementsProps {
  statements: BudgetStatement[];
}

const PreviewStatements = ({ statements }: IPreviewStatementsProps) => {
  const dispatch = useDispatch<TAppDispatch>();

  const handleClose = () => {
    dispatch(SET_PREVIEW_STATEMENTS(undefined));
  };
  return (
    <>
      {statements && (
        <div className="preview-statements">
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
          <CloseButton onClick={handleClose} />
        </div>
      )}
    </>
  );
};

export default PreviewStatements;
