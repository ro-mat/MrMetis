import moment from "moment";
import React, {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import { ADD_ERROR_TOAST, ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import { ADD_STATEMENT } from "store/userdata/userdata.slice";
import { IStatement } from "store/userdata/userdata.types";
import Hint from "../Hint";
import { DATE_FORMAT } from "helpers/dateHelper";
import NewStatementPreview from "./NewStatementPreview";
import useStatementSuggestions from "hooks/useStatementSuggestions";
import useListSelection from "hooks/useListSelection";
import useClosing from "hooks/useClosing";
import { Button, Dropdown, TextInput } from "components/ui";
import { cx } from "components/ui/cx";

const createDefaultStatement = (): IStatement => ({
  id: 0,
  dateCreated: moment().format(DATE_FORMAT),
  budgetId: 0,
  accountId: 0,
  date: moment().format(DATE_FORMAT),
  amount: 0,
});

const QuickAdd = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const [statement, setStatement] = useState<IStatement>(
    createDefaultStatement
  );
  const [isActive, setIsActive] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // the amount filled from a budget, not typed
  const [prefilledAmount, setPrefilledAmount] = useState<number>();
  const { isLocked } = useClosing();

  const { searchText, setSearchText, filteredSuggestions } =
    useStatementSuggestions(statement.date, isActive);
  const {
    selectedId: selectedSuggestion,
    setSelectedId: setSelectedSuggestion,
    move: moveSelection,
  } = useListSelection(filteredSuggestions);

  const isCompleteStatement = (s: IStatement) =>
    !!(s.budgetId && s.accountId && s.amount && s.date);
  const isComplete = isCompleteStatement(statement);

  const suggestionData = (id: string) =>
    filteredSuggestions.find((s) => s.id === id)?.obj ?? {};

  // A budget's defaultAmount fills the amount unless one was typed (before
  // or along with the budget); picking another budget replaces a filled amount.
  // Changes nothing, so it also previews a suggestion.
  const mergeSuggestion = (old: IStatement, id: string) => {
    const { defaultAmount, ...data } = suggestionData(id);
    const next: IStatement = { ...old, ...data };
    let prefilled = prefilledAmount;
    if (data.amount !== undefined) {
      prefilled = undefined;
    } else if (
      data.budgetId !== undefined &&
      (!old.amount || old.amount === prefilled)
    ) {
      next.amount = defaultAmount ?? 0;
      prefilled = defaultAmount;
    }
    return { next, prefilled };
  };

  const withSuggestion = (old: IStatement, id: string): IStatement => {
    const { next, prefilled } = mergeSuggestion(old, id);
    setPrefilledAmount(prefilled);
    return next;
  };

  const applySuggestion = (id: string) =>
    setStatement(withSuggestion(statement, id));

  const resetInput = () => {
    setSearchText("");
    setSelectedSuggestion("");
  };

  const saveStatement = () => {
    // with nothing typed the list only offers budgets, Tab or a click picks one
    const newStatement = searchText
      ? withSuggestion(statement, selectedSuggestion)
      : statement;
    if (!isCompleteStatement(newStatement)) {
      // the suggestion is kept, so only what is missing is left to fill
      setStatement(newStatement);
      dispatch(ADD_ERROR_TOAST(t("errors.missingTransactionData")));
      return;
    }
    if (isLocked(newStatement)) {
      dispatch(ADD_ERROR_TOAST(t("errors.statementClosed")));
      return;
    }
    dispatch(ADD_STATEMENT(newStatement));
    setStatement({ ...newStatement, comment: undefined });

    dispatch(ADD_SUCCESS_TOAST(t("quickAdd.statementAdded")));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.currentTarget.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "Tab":
        applySuggestion(selectedSuggestion);
        resetInput();
        break;
      case "Enter":
        saveStatement();
        resetInput();
        break;
      case "Escape":
        setIsActive(false);
        setSearchText("");
        setStatement(createDefaultStatement());
        setPrefilledAmount(undefined);
        inputRef.current?.blur();
        break;
      case "ArrowDown":
        moveSelection(1);
        break;
      case "ArrowUp":
        moveSelection(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  // collapse only when focus leaves the whole widget (e.g. not onto ">")
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsActive(false);
    }
  };

  // clicks inside the widget (">" button, hint, preview) keep the text focused
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== inputRef.current) {
      event.preventDefault();
    }
  };

  const handlePick = (id: string) => {
    applySuggestion(id);
    resetInput();
    inputRef.current?.focus();
  };

  return (
    <div
      className={cx("quick-add", isActive && "active")}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
    >
      <div className="text-wrapper">
        <TextInput
          placeholder={t("quickAdd.quickAdd")}
          value={searchText}
          ref={inputRef}
          onFocus={() => setIsActive(true)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {isActive && (
          <>
            <Button
              variant="plain"
              className="add"
              disabled={!isComplete}
              onClick={saveStatement}
            >
              {">"}
            </Button>
            <Hint label="?" labelClass="ml-1">
              {t("quickAdd.hint")}
            </Hint>
          </>
        )}
      </div>
      {isActive && (
        <>
          <NewStatementPreview
            statement={statement}
            preview={
              selectedSuggestion
                ? mergeSuggestion(statement, selectedSuggestion).next
                : undefined
            }
          />
          <Dropdown
            items={filteredSuggestions}
            selectedId={selectedSuggestion}
            onHover={setSelectedSuggestion}
            onPick={handlePick}
            emptyText={
              searchText.length > 2 ? t("quickAdd.nothingFound") : undefined
            }
          />
        </>
      )}
    </div>
  );
};

export default QuickAdd;
