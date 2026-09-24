import moment from "moment";
import React, { ChangeEvent, KeyboardEvent, useRef, useState } from "react";
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
import { Button, Dropdown, TextInput } from "components/ui";

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

  const { searchText, setSearchText, filteredSuggestions } =
    useStatementSuggestions();
  const {
    selectedId: selectedSuggestion,
    setSelectedId: setSelectedSuggestion,
    move: moveSelection,
  } = useListSelection(filteredSuggestions);

  const isComplete = !!(
    statement.budgetId &&
    statement.accountId &&
    statement.amount &&
    statement.date
  );

  const suggestionData = (id: string) =>
    filteredSuggestions.find((s) => s.id === id)?.obj ?? {};

  const applySuggestion = (id: string) =>
    setStatement((old) => ({ ...old, ...suggestionData(id) }));

  const resetInput = () => {
    setSearchText("");
    setSelectedSuggestion("");
  };

  const saveStatement = () => {
    if (!isComplete) {
      dispatch(ADD_ERROR_TOAST(t("errors.missingTransactionData")));
      return;
    }

    const newStatement = {
      ...statement,
      ...suggestionData(selectedSuggestion),
    };
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

  const handlePick = (id: string) => {
    applySuggestion(id);
    resetInput();
    inputRef.current?.focus();
  };

  return (
    <div className="quick-add">
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
            <Button disabled={!isComplete} onClick={saveStatement}>
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
          <NewStatementPreview statement={statement} />
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
