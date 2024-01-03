import { FC, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { SET_PREVIEW_STATEMENTS } from "store/ui/ui.slice";
import PreviewStatements from "./PreviewStatements";
import useId from "@mui/material/utils/useId";
import { BudgetPair } from "services/budgetBuilder";

export interface ITableCellPairProps {
  pair: BudgetPair;
  includeChildren?: boolean;
  show?: boolean;
  isStrong?: boolean;
  moreIsGood?: boolean;
}

const TableCellPair: FC<ITableCellPairProps> = ({
  pair,
  includeChildren = false,
  show = true,
  isStrong = false,
  moreIsGood,
}) => {
  const dispatch = useDispatch<TAppDispatch>();
  const pairId = useId();

  const { selectedPreviewStatements } = useSelector(
    (state: AppState) => state.ui.ui.previewStatements
  );

  const showStatementList = useMemo(
    () =>
      pair.statements !== undefined &&
      pair.statements.length > 0 &&
      selectedPreviewStatements === pairId,
    [pair, selectedPreviewStatements, pairId]
  );

  const progressClass = getProgressClass(
    pair.planned,
    pair.actual,
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
          <strong>
            {show &&
              pair.planned + (includeChildren ? pair.getChildrenPlanned() : 0)}
          </strong>
        ) : (
          show &&
          pair.planned + (includeChildren ? pair.getChildrenPlanned() : 0)
        )}
      </td>
      <td
        className={`statement-cell ${
          showStatementList ? "selected" : ""
        } br ${progressClass}`}
        onClick={handleClick}
      >
        {isStrong ? (
          <strong>
            {show &&
              pair.actual + (includeChildren ? pair.getChildrenActual() : 0)}
          </strong>
        ) : (
          show && pair.actual + (includeChildren ? pair.getChildrenActual() : 0)
        )}
        {showStatementList && (
          <PreviewStatements statements={pair.statements ?? []} />
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
