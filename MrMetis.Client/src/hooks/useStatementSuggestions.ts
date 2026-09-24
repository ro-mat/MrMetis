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

  const suggestionList = useMemo(() => {
    const list: ISuggestion[] = getDateSuggestions(t);
    list.push(...getAccountSuggestions(accounts, t));
    list.push(...getBudgetSuggestions(budgets, getAccountById, t));

    return list;
  }, [budgets, accounts, getAccountById, t]);

  // Order: matching named suggestions, then amount, date and comment.
  const filteredSuggestions = useMemo(() => {
    if (searchText.length === 0) {
      return [];
    }

    const list: ISuggestion[] = suggestionList.filter((b) =>
      b.searchText.includes(searchText.toLocaleLowerCase())
    );

    const amount = +searchText;
    if (!isNaN(amount)) {
      list.push({
        id: "a",
        text: `${t("quickAdd.amount")}: ${amount}`,
        searchText: "",
        obj: { amount: amount },
      });
    }

    const date = moment(searchText);
    if (date.isValid()) {
      list.push({
        id: "d",
        text: `${t("quickAdd.date")}: ${date.format(DATE_FORMAT)}`,
        searchText: "",
        obj: { date: date },
      });
    }

    list.push({
      id: "c",
      text: `${t("quickAdd.comment")}: ${searchText}`,
      searchText: "",
      obj: { comment: searchText },
    });

    return list;
  }, [searchText, suggestionList, t]);

  return { searchText, setSearchText, filteredSuggestions };
};

export default useStatementSuggestions;
