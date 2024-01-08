import moment from "moment";
import React, {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import { ADD_ERROR_TOAST, ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import { addStatement } from "store/userdata/userdata.actions";
import { BudgetTypeUser, IStatement } from "store/userdata/userdata.types";
import Hint from "./Hint";
import { DATE_FORMAT } from "helpers/dateHelper";
import useStatement from "hooks/useStatement";
import useAccount from "hooks/useAccount";
import useBudget from "hooks/useBudget";

interface INewStatement extends IStatement {
  budgetName?: string;
  accountName?: string;
}

interface ISuggestion {
  id: string;
  text: string;
  searchText: string;
  obj: any;
}

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
  const [statement, setStatement] = useState<INewStatement>(defaultStatement);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [suggestions, setSuggestions] = useState<ISuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const { budgets } = useBudget();
  const { getById: getAccountById } = useAccount();
  const { getNextId: getNextStatementId } = useStatement();

  const suggestionList = useMemo(() => {
    const list: ISuggestion[] = [
      {
        id: `d1`,
        text: `${t("quickAdd.today")}(${moment().format(DATE_FORMAT)})`,
        searchText: t("quickAdd.today"),
        obj: {
          date: moment().toDate(),
        },
      },
      {
        id: `d2`,
        text: `${t("quickAdd.yesterday")}(${moment()
          .add(-1, "d")
          .format(DATE_FORMAT)})`,
        searchText: t("quickAdd.yesterday"),
        obj: {
          date: moment().add(-1, "d").toDate(),
        },
      },
    ];
    list.push(
      ...budgets.map((b) => {
        const account = getAccountById(b.fromAccountId);
        return {
          id: `b${b.id}`,
          text: `${t("quickAdd.budget")}(${account?.name}-${
            BudgetTypeUser[b.type]
          }): ${b.name}`,
          searchText: b.name.toLocaleLowerCase(),
          obj: {
            budgetId: b.id,
            budgetName: b.name,
            accountId: b.fromAccountId,
            accountName: account?.name,
          },
        } as ISuggestion;
      })
    );
    return list;
  }, [budgets, getAccountById, t]);

  const handleOnFocus = () => {
    setShowDropdown(true);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputText(event.currentTarget.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "Tab": {
        applySelectedSuggestion();
        setInputText("");
        setSelectedSuggestion("");
        event.preventDefault();
        break;
      }
      case "Enter": {
        saveStatement();
        setInputText("");
        setSelectedSuggestion("");
        event.preventDefault();
        break;
      }
      case "Escape": {
        if (inputText.length > 0) {
          setInputText("");
          return;
        }
        if (
          statement.budgetId > 0 ||
          statement.accountId > 0 ||
          statement.amount > 0
        ) {
          setStatement(defaultStatement);
          return;
        }

        setShowDropdown(false);
        inputRef.current?.blur();
        event.preventDefault();
        break;
      }
      case "ArrowDown": {
        const newIndex =
          suggestions.findIndex((s) => s.id === selectedSuggestion) + 1;
        setSelectedSuggestion(
          newIndex >= suggestions.length
            ? suggestions[0].id
            : suggestions[newIndex].id
        );
        event.preventDefault();
        break;
      }
      case "ArrowUp": {
        const newIndex =
          suggestions.findIndex((s) => s.id === selectedSuggestion) - 1;
        setSelectedSuggestion(
          newIndex < 0
            ? suggestions[suggestions.length - 1].id
            : suggestions[newIndex].id
        );
        event.preventDefault();
        break;
      }
    }
  };

  const applySelectedSuggestion = () => {
    const newData = suggestions.find((s) => s.id === selectedSuggestion)?.obj;
    setStatement((old) => {
      return { ...old, ...(newData ?? {}) };
    });
  };

  const handleClick = () => {
    applySelectedSuggestion();

    setInputText("");
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
    if (suggestions.length > 0) {
      newData = suggestions.find((s) => s.id === selectedSuggestion)?.obj;
      setStatement((old) => {
        return { ...old, ...(newData ?? {}) };
      });
    }

    const newStatement = {
      ...statement,
      ...newData,
      id: getNextStatementId(),
    };

    delete newStatement.budgetName;
    delete newStatement.accountName;

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
    if (inputText.length === 0) {
      setSuggestions([]);
      return;
    }

    const list: ISuggestion[] = [
      {
        id: "c",
        text: `${t("quickAdd.comment")}: ${inputText}`,
        searchText: "",
        obj: { comment: inputText },
      },
    ];

    const amount = +inputText;
    if (!isNaN(amount)) {
      list.unshift(
        ...[
          {
            id: "a",
            text: `${t("quickAdd.amount")}: ${amount}`,
            searchText: "",
            obj: { amount: amount },
          },
        ]
      );
    }

    const date = moment(inputText);
    if (date.isValid()) {
      list.unshift(
        ...[
          {
            id: "d",
            text: `${t("quickAdd.date")}: ${date.format(DATE_FORMAT)}`,
            searchText: "",
            obj: { date: date },
          },
        ]
      );
    }

    list.unshift(
      ...suggestionList.filter((b) =>
        b.searchText.includes(inputText.toLocaleLowerCase())
      )
    );

    setSuggestions(list);
  }, [suggestionList, inputText, t]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setSelectedSuggestion("");
      return;
    }
    setSelectedSuggestion(suggestions[0].id);
  }, [suggestions]);

  return (
    <div className="quick-add">
      <div className="text-wrapper">
        <input
          type="text"
          placeholder={t("quickAdd.quickAdd")}
          value={inputText}
          ref={inputRef}
          onFocus={handleOnFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {showDropdown && (
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
      {showDropdown && (
        <>
          <div>
            <span className={statement.budgetName ? "" : "error"}>
              {t("quickAdd.budget")}: {statement.budgetName ?? "N/A"}
            </span>
            ,{" "}
            <span className={statement.accountName ? "" : "error"}>
              {t("quickAdd.account")}: {statement.accountName ?? "N/A"}
            </span>
            ,{" "}
            <span>
              {t("quickAdd.date")}: {moment(statement.date).format(DATE_FORMAT)}
            </span>
            ,{" "}
            <span className={statement.amount === 0 ? "error" : ""}>
              {t("quickAdd.amount")}: {statement.amount.toFixed(2)}
            </span>
            ,{" "}
            <span>
              {t("quickAdd.comment")}: {statement.comment}
            </span>
          </div>
          <div className="dropdown-wrapper">
            {suggestions.length > 0 &&
              suggestions.map((s) => (
                <div
                  key={s.id}
                  className={`${s.id === selectedSuggestion ? "selected" : ""}`}
                  onMouseOver={() => setSelectedSuggestion(s.id)}
                  onClick={handleClick}
                >
                  {s.text}
                </div>
              ))}
            {suggestions.length === 0 && inputText.length > 2 && (
              <div>{t("quickAdd.nothingFound")}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default QuickAdd;
