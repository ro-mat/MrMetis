import { useMemo, useState } from "react";
import useBudget from "./useBudget";
import useAccount from "./useAccount";
import useLocale from "./useLocale";
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
  const { formatAmount, formatDate, parseAmount, parseDate } = useLocale();

  const [searchText, setSearchText] = useState<string>("");

  const suggestionList = useMemo(() => {
    const list: ISuggestion[] = getDateSuggestions(t, formatDate);
    list.push(...getAccountSuggestions(accounts, t));
    list.push(...getBudgetSuggestions(budgets, getAccountById, t));

    return list;
  }, [budgets, accounts, getAccountById, t, formatDate]);

  // Order: matching named suggestions, then amount, date and comment.
  const filteredSuggestions = useMemo(() => {
    if (searchText.length === 0) {
      return [];
    }

    const list: ISuggestion[] = suggestionList.filter((b) =>
      b.searchText.includes(searchText.toLocaleLowerCase())
    );

    const amount = parseAmount(searchText);
    if (amount !== undefined && !isNaN(amount)) {
      list.push({
        id: "a",
        text: `${t("quickAdd.amount")}: ${formatAmount(amount)}`,
        searchText: "",
        obj: { amount: amount },
      });
    }

    const date = parseDate(searchText);
    if (date) {
      list.push({
        id: "d",
        text: `${t("quickAdd.date")}: ${formatDate(date)}`,
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
  }, [
    searchText,
    suggestionList,
    t,
    formatAmount,
    formatDate,
    parseAmount,
    parseDate,
  ]);

  return { searchText, setSearchText, filteredSuggestions };
};

export default useStatementSuggestions;
