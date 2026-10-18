import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import moment, { MomentInput } from "moment";
import { AppState } from "store/store";
import useBudget from "./useBudget";
import useAccount from "./useAccount";
import useLocale from "./useLocale";
import useBudgetCalculate from "./useBudgetCalculate";
import { useTranslation } from "react-i18next";
import {
  getAccountSuggestions,
  getBudgetSuggestions,
  getDateSuggestions,
  IBudgetInfo,
  splitQuickAddText,
} from "helpers/statementSuggestionHelper";
import { isMonthClosed, plannedAccounts } from "services/budgetClosing";
import { roundTo } from "helpers/numberHelper";

export interface ISuggestion {
  id: string;
  text: string;
  searchText: string;
  obj: any;
}

// budgets offered before anything is typed
const ON_FOCUS_COUNT = 5;

// Budgets are ranked by what is left of them in the month of `date`.
// Nothing is calculated while not `enabled`.
const useStatementSuggestions = (date: MomentInput, enabled: boolean) => {
  const { t } = useTranslation();
  const { budgets } = useBudget();
  const { accounts, getById: getAccountById } = useAccount();
  const closedMonths = useSelector(
    (state: AppState) => state.data.userdata.closedMonths
  );
  const { formatAmount, formatDate, parseAmount, parseDate } = useLocale();

  const [searchText, setSearchText] = useState<string>("");

  const month = moment(date).startOf("M");
  const monthKey = month.format("YYYY-MM");
  const offset = month.diff(moment().startOf("M"), "M");
  const { budgetPairArray } = useBudgetCalculate(offset, offset, enabled);

  const budgetInfo = useMemo(() => {
    const info = new Map<number, IBudgetInfo>();
    if (!enabled) return info;

    const monthStart = moment(monthKey, "YYYY-MM");
    const monthClosed = isMonthClosed(closedMonths, monthStart);
    for (const b of budgets) {
      const pair = budgetPairArray.getBudgetPair(b.id, monthStart);
      info.set(b.id, {
        left: pair ? roundTo(Math.max(pair.planned - pair.actual, 0), 2) : 0,
        isClosed: monthClosed || !!pair?.isClosed,
        accountIds: plannedAccounts(b, monthStart),
      });
    }
    return info;
  }, [enabled, monthKey, closedMonths, budgets, budgetPairArray]);

  const budgetSuggestions = useMemo(
    () =>
      getBudgetSuggestions(
        budgets,
        budgetInfo,
        getAccountById,
        t,
        formatAmount
      ),
    [budgets, budgetInfo, getAccountById, t, formatAmount]
  );

  const dateSuggestions = useMemo(
    () => getDateSuggestions(t, formatDate),
    [t, formatDate]
  );

  const suggestionList = useMemo(() => {
    const list: ISuggestion[] = [...dateSuggestions];
    list.push(...getAccountSuggestions(accounts, t));
    list.push(...budgetSuggestions);

    return list;
  }, [dateSuggestions, budgetSuggestions, accounts, t]);

  // Order: matching named suggestions, then amount, date and comment.
  // Nothing typed: the open budgets with the most left.
  // Several words with an amount or a date: the named suggestions matching
  // the other words, each with the amount and date, then those other words
  // as a comment (or the amount and date alone).
  const filteredSuggestions = useMemo(() => {
    if (searchText.length === 0) {
      return budgetSuggestions
        .filter((s) => {
          const info = budgetInfo.get(s.obj.budgetId);
          return info && !info.isClosed && info.left > 0;
        })
        .slice(0, ON_FOCUS_COUNT);
    }

    const matching = (text: string) =>
      suggestionList.filter((b) =>
        b.searchText.includes(text.toLocaleLowerCase())
      );
    const comment: ISuggestion = {
      id: "c",
      text: `${t("quickAdd.comment")}: ${searchText}`,
      searchText: "",
      obj: { comment: searchText },
    };

    const parts = splitQuickAddText(
      searchText,
      dateSuggestions,
      parseAmount,
      parseDate
    );
    if (parts) {
      const { rest, amount, date } = parts;
      const extras = {
        ...(amount !== undefined && { amount }),
        ...(date !== undefined && { date }),
      };
      const extrasText = [
        amount !== undefined &&
          `${t("quickAdd.amount")}: ${formatAmount(amount)}`,
        date !== undefined && `${t("quickAdd.date")}: ${formatDate(date)}`,
      ]
        .filter(Boolean)
        .join(", ");

      const list: ISuggestion[] = (rest ? matching(rest) : [])
        // a date word among the other words can't replace the date taken out
        .filter((s) => date === undefined || s.obj.date === undefined)
        .map((s) => ({
          id: `x${s.id}`,
          text: `${s.text} · ${extrasText}`,
          searchText: "",
          obj: { ...s.obj, ...extras },
        }));
      list.push(
        rest
          ? {
              id: "xc",
              text: `${extrasText}, ${t("quickAdd.comment")}: ${rest}`,
              searchText: "",
              obj: { ...extras, comment: rest },
            }
          : { id: "x", text: extrasText, searchText: "", obj: extras }
      );
      list.push(comment);
      return list;
    }

    const list: ISuggestion[] = matching(searchText);

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

    list.push(comment);

    return list;
  }, [
    searchText,
    suggestionList,
    dateSuggestions,
    budgetSuggestions,
    budgetInfo,
    t,
    formatAmount,
    formatDate,
    parseAmount,
    parseDate,
  ]);

  return { searchText, setSearchText, filteredSuggestions };
};

export default useStatementSuggestions;
