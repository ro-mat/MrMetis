import { FC, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { SET_PREVIEW_STATEMENTS } from "store/ui/ui.slice";
import { IStatement } from "store/userdata/userdata.types";
import PreviewStatements from "./PreviewStatements";
import useId from "@mui/material/utils/useId";

export interface ITableCellPairProps {
  valuePlanned: number;
  valueActual: number;
  show?: boolean;
  isStrong?: boolean;
  moreIsGood?: boolean;
  statements?: IStatement[];
}

const TableCellPair: FC<ITableCellPairProps> = ({
  valuePlanned,
  valueActual,
  show = true,
  isStrong = false,
  moreIsGood,
  statements,
}) => {
  const dispatch = useDispatch<TAppDispatch>();
  const pairId = useId();

  const { selectedPreviewStatements } = useSelector(
    (state: AppState) => state.ui.ui.previewStatements
  );

  const showStatementList = useMemo(
    () =>
      statements !== undefined &&
      statements.length > 0 &&
      selectedPreviewStatements === pairId,
    [statements, selectedPreviewStatements, pairId]
  );

  const progressClass = getProgressClass(
    valuePlanned,
    valueActual,
    show,
    moreIsGood
  );

  const handleClick = () => {
    if (selectedPreviewStatements === pairId) {
      return;
    }

    dispatch(SET_PREVIEW_STATEMENTS(pairId));
  };

  return (
    <>
      <td className="bl">
        {isStrong ? (
          <strong>{show && valuePlanned.toFixed(2)}</strong>
        ) : (
          show && valuePlanned.toFixed(2)
        )}
      </td>
      <td
        className={`statement-cell ${
          showStatementList ? "selected" : ""
        } br ${progressClass}`}
        onClick={handleClick}
      >
        {isStrong ? (
          <strong>{show && valueActual.toFixed(2)}</strong>
        ) : (
          show && valueActual.toFixed(2)
        )}
        {showStatementList && (
          <PreviewStatements statements={statements ?? []} />
        )}
      </td>
    </>
  );
};

const getProgressClass = (
  valuePlanned: number,
  valueActual: number,
  show: boolean,
  moreIsGood?: boolean
) => {
  if (!show || valueActual === 0) {
    return "";
  }

  if (valuePlanned === 0) {
    return valueActual > 0 ? "g" : "r";
  }

  const diff = valueActual - valuePlanned;
  const ratio = valueActual / valuePlanned;
  const perc = (ratio * 100).toFixed(0);

  if (moreIsGood) {
    return diff >= 0 ? "g" : `rp-${perc}`;
  }

  return diff <= 0 ? `gp-${perc}` : "r";
};

export default TableCellPair;
