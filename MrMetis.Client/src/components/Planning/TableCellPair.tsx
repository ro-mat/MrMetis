import { FC, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { SET_PREVIEW_STATEMENTS } from "store/ui/ui.slice";
import PreviewStatements from "./PreviewStatements";
import useId from "@mui/material/utils/useId";
import { BudgetPair } from "services/budgetBuilder";
import { BudgetType, BudgetTypeExtra } from "store/userdata/userdata.types";

export interface ITableCellPairProps {
  pair?: BudgetPair;
  includeChildren?: boolean;
  isStrong?: boolean;
  moreIsGood?: boolean;
}

const alwaysShowBudgetTypes = [
  BudgetTypeExtra.leftFromPrevMonth,
  BudgetTypeExtra.openingBalance,
  BudgetTypeExtra.closingBalance,
  BudgetTypeExtra.monthDelta,
];

const TableCellPair: FC<ITableCellPairProps> = ({
  pair,
  includeChildren = false,
  isStrong = false,
  moreIsGood,
}) => {
  const dispatch = useDispatch<TAppDispatch>();
  const pairId = useId();

  const { selectedPreviewStatements } = useSelector(
    (state: AppState) => state.ui.ui.previewStatements
  );

  const handleClick = () => {
    if (selectedPreviewStatements === pairId) {
      return;
    }

    dispatch(SET_PREVIEW_STATEMENTS(pairId));
  };

  const show = useMemo<boolean>(
    () =>
      !!pair &&
      (forceShow(pair.budgetType) ||
        !!pair.planned ||
        !!pair.actual ||
        !!pair.getChildrenPlanned() ||
        !!pair.getChildrenActual()),
    [pair]
  );

  const planned = useMemo(
    () =>
      show
        ? pair!.planned + (includeChildren ? pair!.getChildrenPlanned() : 0)
        : undefined,
    [show, pair, includeChildren]
  );

  const actual = useMemo(
    () =>
      show
        ? pair!.actual + (includeChildren ? pair!.getChildrenActual() : 0)
        : undefined,
    [show, pair, includeChildren]
  );

  const progressClass = useMemo(
    () => getProgressClass(planned ?? 0, actual ?? 0, show, moreIsGood),
    [planned, actual, show, moreIsGood]
  );

  const statements = useMemo(() => {
    if (!pair) return [];
    const childStatements = includeChildren ? pair.getChildrenStatements() : [];
    return [...pair.statements, ...childStatements];
  }, [pair, includeChildren]);

  const showStatementList = useMemo(
    () => statements.length > 0 && selectedPreviewStatements === pairId,
    [statements, selectedPreviewStatements, pairId]
  );

  return (
    <>
      <td className="bl">
        {isStrong ? (
          <strong>{planned?.toFixed(2)}</strong>
        ) : (
          planned?.toFixed(2)
        )}
      </td>
      <td
        className={`statement-cell ${
          showStatementList ? "selected" : ""
        } br ${progressClass}`}
        onClick={handleClick}
      >
        {isStrong ? <strong>{actual?.toFixed(2)}</strong> : actual?.toFixed(2)}
        {showStatementList && <PreviewStatements statements={statements} />}
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

const forceShow = (budgetType: BudgetType) => {
  return !!alwaysShowBudgetTypes.find((a) => a === budgetType);
};

export default TableCellPair;
