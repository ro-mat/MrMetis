import { useMemo, useState } from "react";
import useBudget from "./useBudget";
import useAccount from "./useAccount";
import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";
import { useTranslation } from "react-i18next";
import {
  getAccountSuggestions,
  getBudgetSuggestions,
  getDateSuggestions,
} from "helpers/statementSuggestionHelper";

export interface ISuggestion {
  id: string;
  text: string;
  searchText: string;
  obj: any;
}

const useStatementSuggestions = () => {
  const { t } = useTranslation();
  const { budgets } = useBudget();
  const { accounts, getById: getAccountById } = useAccount();

  const [searchText, setSearchText] = useState<string>("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<ISuggestion[]>(
    []
  );

  const suggestionList = useMemo(() => {
    const list: ISuggestion[] = getDateSuggestions(t);
    list.push(...getAccountSuggestions(accounts, t));
    list.push(...getBudgetSuggestions(budgets, getAccountById, t));

    return list;
  }, [budgets, accounts, getAccountById, t]);

  const filterSuggestions = (inputText: string) => {
    setSearchText(inputText);

    if (inputText.length === 0) {
      setFilteredSuggestions([]);
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

    list.unshift(
      ...suggestionList.filter((b) =>
        b.searchText.includes(inputText.toLocaleLowerCase())
      )
    );

    setFilteredSuggestions(list);
  };

  return { searchText, suggestionList, filteredSuggestions, filterSuggestions };
};

export default useStatementSuggestions;
