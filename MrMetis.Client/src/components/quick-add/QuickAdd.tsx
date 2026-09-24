import moment from "moment";
import React, {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
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
import SuggestionDropdown from "./SuggestionDropdown";
import useStatementSuggestions from "hooks/useStatementSuggestions";

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
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const { searchText, setSearchText, filteredSuggestions } =
    useStatementSuggestions();

  const isComplete = !!(
    statement.budgetId &&
    statement.accountId &&
    statement.amount &&
    statement.date
  );

  const getSelectedSuggestionData = () =>
    filteredSuggestions.find((s) => s.id === selectedSuggestion)?.obj ?? {};

  const resetInput = () => {
    setSearchText("");
    setSelectedSuggestion("");
  };

  const moveSelection = (step: 1 | -1) => {
    const count = filteredSuggestions.length;
    if (count === 0) return;

    const index = filteredSuggestions.findIndex(
      (s) => s.id === selectedSuggestion
    );
    setSelectedSuggestion(
      filteredSuggestions[(index + step + count) % count].id
    );
  };

  const applySelectedSuggestion = () => {
    const newData = getSelectedSuggestionData();
    setStatement((old) => ({ ...old, ...newData }));
  };

  const saveStatement = () => {
    if (!isComplete) {
      dispatch(ADD_ERROR_TOAST(t("errors.missingTransactionData")));
      return;
    }

    const newStatement = { ...statement, ...getSelectedSuggestionData() };
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
        applySelectedSuggestion();
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

  const handleClick = () => {
    applySelectedSuggestion();
    resetInput();
    inputRef.current?.focus();
  };

  // Preselect the first suggestion whenever the list changes.
  useEffect(() => {
    setSelectedSuggestion(filteredSuggestions[0]?.id ?? "");
  }, [filteredSuggestions]);

  return (
    <div className="quick-add">
      <div className="text-wrapper">
        <input
          type="text"
          placeholder={t("quickAdd.quickAdd")}
          value={searchText}
          ref={inputRef}
          onFocus={() => setIsActive(true)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {isActive && (
          <>
            <button
              className="small secondary"
              disabled={!isComplete}
              onClick={saveStatement}
            >
              {">"}
            </button>
            <Hint label="?" labelClass="ml-1">
              {t("quickAdd.hint")}
            </Hint>
          </>
        )}
      </div>
      {isActive && (
        <>
          <NewStatementPreview statement={statement} />
          <SuggestionDropdown
            inputText={searchText}
            suggestions={filteredSuggestions}
            selectedSuggestion={selectedSuggestion}
            setSelectedSuggestion={setSelectedSuggestion}
            handleClickSuggestion={handleClick}
          />
        </>
      )}
    </div>
  );
};

export default QuickAdd;
