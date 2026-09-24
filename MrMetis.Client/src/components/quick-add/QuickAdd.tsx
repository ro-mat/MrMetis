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
import { addStatement } from "store/userdata/userdata.actions";
import { IStatement } from "store/userdata/userdata.types";
import Hint from "../Hint";
import { DATE_FORMAT } from "helpers/dateHelper";
import useStatement from "hooks/useStatement";
import NewStatementPreview from "./NewStatementPreview";
import SuggestionDropdown from "./SuggestionDropdown";
import useStatementSuggestions from "hooks/useStatementSuggestions";

const QuickAdd = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const defaultStatement = {
    id: 0,
    dateCreated: moment().format(DATE_FORMAT),
    budgetId: 0,
    accountId: 0,
    date: moment().format(DATE_FORMAT),
    amount: 0,
  };
  const [statement, setStatement] = useState<IStatement>(defaultStatement);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const { getNextId: getNextStatementId } = useStatement();

  const { searchText, filteredSuggestions, filterSuggestions } =
    useStatementSuggestions();

  const handleOnFocus = () => {
    setIsActive(true);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    filterSuggestions(event.currentTarget.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "Tab": {
        applySelectedSuggestion();
        filterSuggestions("");
        setSelectedSuggestion("");
        event.preventDefault();
        break;
      }
      case "Enter": {
        saveStatement();
        filterSuggestions("");
        setSelectedSuggestion("");
        event.preventDefault();
        break;
      }
      case "Escape": {
        setIsActive(false);
        filterSuggestions("");
        setStatement(defaultStatement);
        inputRef.current?.blur();
        event.preventDefault();
        break;
      }
      case "ArrowDown": {
        const newIndex =
          filteredSuggestions.findIndex((s) => s.id === selectedSuggestion) + 1;
        setSelectedSuggestion(
          newIndex >= filteredSuggestions.length
            ? filteredSuggestions[0].id
            : filteredSuggestions[newIndex].id
        );
        event.preventDefault();
        break;
      }
      case "ArrowUp": {
        const newIndex =
          filteredSuggestions.findIndex((s) => s.id === selectedSuggestion) - 1;
        setSelectedSuggestion(
          newIndex < 0
            ? filteredSuggestions[filteredSuggestions.length - 1].id
            : filteredSuggestions[newIndex].id
        );
        event.preventDefault();
        break;
      }
    }
  };

  const applySelectedSuggestion = () => {
    const newData = filteredSuggestions.find(
      (s) => s.id === selectedSuggestion
    )?.obj;
    setStatement((old) => {
      return { ...old, ...(newData ?? {}) };
    });
  };

  const handleClick = () => {
    applySelectedSuggestion();

    filterSuggestions("");
    setSelectedSuggestion("");
    inputRef.current?.focus();
  };

  const saveStatement = () => {
    if (
      !(
        statement.budgetId &&
        statement.accountId &&
        statement.amount &&
        statement.date
      )
    ) {
      dispatch(ADD_ERROR_TOAST(t("errors.missingTransactionData")));
      return;
    }

    let newData = {};
    if (filteredSuggestions.length > 0) {
      newData = filteredSuggestions.find(
        (s) => s.id === selectedSuggestion
      )?.obj;
      setStatement((old) => {
        return { ...old, ...(newData ?? {}) };
      });
    }

    const newStatement = {
      ...statement,
      ...newData,
      id: getNextStatementId(),
    };

    dispatch(addStatement(newStatement));

    setStatement((s) => {
      return { ...s, comment: undefined };
    });

    dispatch(ADD_SUCCESS_TOAST(t("quickAdd.statementAdded")));
  };

  const handleSubmitClick = () => {
    saveStatement();
  };

  useEffect(() => {
    if (filteredSuggestions.length === 0) {
      setSelectedSuggestion("");
      return;
    }
    setSelectedSuggestion(filteredSuggestions[0].id);
  }, [filteredSuggestions]);

  return (
    <div className="quick-add">
      <div className="text-wrapper">
        <input
          type="text"
          placeholder={t("quickAdd.quickAdd")}
          value={searchText}
          ref={inputRef}
          onFocus={handleOnFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {isActive && (
          <>
            <button
              className="small secondary"
              disabled={
                !(
                  statement.budgetId &&
                  statement.accountId &&
                  statement.amount &&
                  statement.date
                )
              }
              onClick={handleSubmitClick}
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
