import { ISuggestion } from "hooks/useStatementSuggestions";
import moment, { Moment } from "moment";
import { TFunction } from "react-i18next";
import {
  BudgetTypeUser,
  IAccount,
  IBudget,
} from "store/userdata/userdata.types";
import { DATE_FORMAT } from "./dateHelper";

const getDateSuggestion = (
  id: string,
  date: Moment,
  textKey: string,
  t: TFunction<"translation", undefined>
) => {
  const text = t(`quickAdd.${textKey}`);
  return {
    id: id,
    text: `${text}(${date.format(DATE_FORMAT)})`,
    searchText: text.toLowerCase(),
    obj: {
      date: date.toDate(),
    },
  };
};

export const getDateSuggestions = (t: TFunction<"translation", undefined>) => {
  const list = [
    getDateSuggestion("d1", moment(), "today", t),
    getDateSuggestion("d2", moment().add(-1, "d"), "yesterday", t),
  ];
  for (let i = -1; i >= -7; i--) {
    let date = moment().add(i, "d");
    list.push(
      getDateSuggestion(`d${i}`, date, date.format("dddd").toLowerCase(), t)
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
