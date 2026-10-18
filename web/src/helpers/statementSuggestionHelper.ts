import { ISuggestion } from "hooks/useStatementSuggestions";
import moment, { Moment, MomentInput } from "moment";
import { TFunction } from "i18next";
import {
  BudgetTypeUser,
  IAccount,
  IBudget,
} from "store/userdata/userdata.types";
import { formatInLanguage } from "./dateHelper";

type DateFormatter = (date: Moment) => string;

// `text` is shown and searched, e.g. "today" or a weekday's name
const getDateSuggestion = (
  id: string,
  date: Moment,
  text: string,
  formatDate: DateFormatter
) => {
  return {
    id: id,
    text: `${text}(${formatDate(date)})`,
    searchText: text.toLowerCase(),
    obj: {
      date: date.toDate(),
    },
  };
};

export const getDateSuggestions = (
  t: TFunction<"translation", undefined>,
  formatDate: DateFormatter
) => {
  const list = [
    getDateSuggestion("d1", moment(), t("quickAdd.today"), formatDate),
    getDateSuggestion(
      "d2",
      moment().add(-1, "d"),
      t("quickAdd.yesterday"),
      formatDate
    ),
  ];
  // weekday names in the app's language
  for (let i = -1; i >= -7; i--) {
    const date = moment().add(i, "d");
    list.push(
      getDateSuggestion(
        `d${i}`,
        date,
        formatInLanguage(date, "dddd"),
        formatDate
      )
    );
  }

  return list;
};

export const getAccountSuggestions = (
  accounts: IAccount[],
  t: TFunction<"translation", undefined>
) => {
  return accounts.map((a) => {
    return {
      id: `a${a.id}`,
      text: `${t("quickAdd.account")}: ${a.name}`,
      searchText: a.name.toLocaleLowerCase(),
      obj: {
        accountId: a.id,
      },
    } as ISuggestion;
  });
};

// A budget in the month the statement is for.
export interface IBudgetInfo {
  // planned minus actual, never below 0
  left: number;
  isClosed: boolean;
  // the accounts it is planned on
  accountIds: number[];
}

// open with something left (most left first), then the other open ones, then
// the closed ones, which can't take statements
const rank = (info?: IBudgetInfo) =>
  !info ? 1 : info.isClosed ? 2 : info.left > 0 ? 0 : 1;

export const compareBudgetInfo = (a?: IBudgetInfo, b?: IBudgetInfo) =>
  rank(a) - rank(b) || (b?.left ?? 0) - (a?.left ?? 0);

export const getBudgetSuggestions = (
  budgets: IBudget[],
  info: Map<number, IBudgetInfo>,
  getAccountById: (id: number | undefined) => IAccount | undefined,
  t: TFunction<"translation", undefined>,
  formatAmount: (value: number) => string
) => {
  return [...budgets]
    .sort((a, b) => compareBudgetInfo(info.get(a.id), info.get(b.id)))
    .map((b) => {
      const account = getAccountById(b.fromAccountId);
      const budgetInfo = info.get(b.id);
      const state = budgetInfo?.isClosed
        ? ` · ${t("quickAdd.closed")}`
        : budgetInfo && budgetInfo.left > 0
          ? ` · ${t("quickAdd.left", { amount: formatAmount(budgetInfo.left) })}`
          : "";
      // an account is only filled when it is the only one; otherwise the one
      // chosen before stays
      const accountIds = budgetInfo?.accountIds ?? [];
      // a one-time bill is usually paid in full, see QuickAdd
      const isOneTimeLeft =
        b.closeAfterOneStatement &&
        !!budgetInfo &&
        !budgetInfo.isClosed &&
        budgetInfo.left > 0;
      return {
        id: `b${b.id}`,
        text: `${t("quickAdd.budget")}(${account?.name ?? ""}-${
          BudgetTypeUser[b.type]
        }): ${b.name}${state}`,
        searchText: b.name.toLocaleLowerCase(),
        obj: {
          budgetId: b.id,
          ...(accountIds.length === 1 && { accountId: accountIds[0] }),
          ...(isOneTimeLeft && { defaultAmount: budgetInfo.left }),
        },
      } as ISuggestion;
    });
};

export interface IQuickAddParts {
  // the words left for a budget, an account or a comment
  rest: string;
  amount?: number;
  date?: MomentInput;
}

// Text like "coffee 4.5 yesterday": the first word that is an amount and the
// first that is a date (a date word or a typed date) are taken out. Undefined
// for a single word, for text that is an amount or a date as a whole (e.g.
// "1 000"), and when no word is either.
export const splitQuickAddText = (
  text: string,
  dateSuggestions: ISuggestion[],
  parseAmount: (text: string) => number | undefined,
  parseDate: (text: string) => Moment | undefined
): IQuickAddParts | undefined => {
  const isAmount = (s: string) => {
    const amount = parseAmount(s);
    return amount !== undefined && !isNaN(amount) ? amount : undefined;
  };
  const tokens = text.trim().split(/\s+/);
  if (tokens.length < 2 || isAmount(text) !== undefined || parseDate(text)) {
    return undefined;
  }

  const rest: string[] = [];
  let amount: number | undefined;
  let date: MomentInput | undefined;
  for (const token of tokens) {
    const tokenAmount = isAmount(token);
    if (amount === undefined && tokenAmount !== undefined) {
      amount = tokenAmount;
      continue;
    }
    const lower = token.toLocaleLowerCase();
    const tokenDate =
      dateSuggestions.find((s) => s.searchText === lower)?.obj.date ??
      parseDate(token);
    if (date === undefined && tokenDate) {
      date = tokenDate;
      continue;
    }
    rest.push(token);
  }

  return amount === undefined && date === undefined
    ? undefined
    : { rest: rest.join(" "), amount, date };
};
