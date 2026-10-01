import { ISuggestion } from "hooks/useStatementSuggestions";
import moment, { Moment } from "moment";
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

export const getBudgetSuggestions = (
  budgets: IBudget[],
  getAccountById: (id: number | undefined) => IAccount | undefined,
  t: TFunction<"translation", undefined>
) => {
  return budgets.map((b) => {
    const account = getAccountById(b.fromAccountId);
    return {
      id: `b${b.id}`,
      text: `${t("quickAdd.budget")}(${account?.name ?? ""}-${
        BudgetTypeUser[b.type]
      }): ${b.name}`,
      searchText: b.name.toLocaleLowerCase(),
      obj: {
        budgetId: b.id,
        accountId: b.fromAccountId,
      },
    } as ISuggestion;
  });
};
