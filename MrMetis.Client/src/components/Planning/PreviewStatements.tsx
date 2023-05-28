import moment from "moment";
import React from "react";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import { SET_PREVIEW_STATEMENTS } from "store/ui/ui.slice";
import { IStatement } from "store/userdata/userdata.types";

interface IPreviewStatementsProps {
  statements: IStatement[];
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
                    {moment(s.date).format("yyyy-MM-DD")} {s.amount.toFixed(2)}
                  </div>
                  <div>{s.comment}</div>
                </div>
              ))}
          </div>
          <button onClick={handleClose} className="close">
            X
          </button>
        </div>
      )}
    </>
  );
};

export default PreviewStatements;
