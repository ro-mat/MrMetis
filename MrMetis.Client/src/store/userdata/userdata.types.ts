import { IBaseState } from "store/store";
import { IAmount } from "types/IAmount";
import { IHaveMetadata } from "types/IHaveMetadata";
import { IMonthAmountPair } from "types/IMonthAmountPair";

export interface IUserdataState extends IBaseState {
  userdata: IUserdata;
  savePending: boolean;
  // stored data was loaded (and decrypted), so it's safe to save over it
  loaded: boolean;
  // size of the stored (encrypted) data and the user's limit, from the server
  storage?: IStorageUsage;
  // the last save was refused for exceeding the limit
  saveFailed: boolean;
}

export interface IStorageUsage {
  usedBytes: number;
  limitBytes: number;
}

export interface IUserdata {
  statements: IStatement[];
  budgets: IBudget[];
  accounts: IAccount[];
  preferences: IPreferences;
}

export interface IStatement extends IHaveMetadata {
  amount: number;
  comment?: string;
  date: string;
  budgetId: number;
  accountId: number;
}

export interface IBudget extends IHaveMetadata {
  name: string;
  parentId?: number;
  fromAccountId?: number;
  toAccountId: number;
  isEssential: boolean;
  amounts: IAmount[];
  overrides: IMonthAmountPair[];
  type: BudgetType;
  expectOneStatement: boolean;
}

export interface IAccount extends IHaveMetadata {
  name: string;
  leftFromPrevMonth: IMonthAmountPair[];
}

export interface IUserdataDto {
  statements: IStatement[];
  budgets: IBudget[];
  accounts: IAccount[];
  preferences?: IPreferences;
}

export interface IPreferences {
  locale: ILocalePreferences;
  // "en" | "ru"; not set: the browser's language is used
  language?: string;
  showLanguageInHeader: boolean;
  currency: ICurrencyPreferences;
  idleTimeoutMinutes: number;
  // not applied yet
  theme: Theme;
}

export type DateOrder = "DMY" | "MDY" | "YMD";
export type DateSeparator = "." | "/" | "-";
export type DecimalSeparator = "." | ",";
export type ThousandsSeparator = "," | "." | " " | "'" | "";
// 0 is Sunday, as in moment and the datepicker
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Theme = "auto" | "light" | "dark";

// A country preset; every other field overrides the country's value when set.
export interface ILocalePreferences {
  country: string;
  dateOrder?: DateOrder;
  dateSeparator?: DateSeparator;
  decimalSeparator?: DecimalSeparator;
  thousandsSeparator?: ThousandsSeparator;
  firstDayOfWeek?: WeekDay;
}

export interface ICurrencyPreferences {
  // "" shows plain numbers
  symbol: string;
  position: "before" | "after";
  decimals: 0 | 2;
  negativeStyle: "minus" | "parentheses";
}

export enum BudgetTypeUser {
  income = 10,
  spending = 20,
  loanReturn = 30,
  savings = 40,
  transferToAccount = 50,
  keepOnAccount = 60,
}

export enum BudgetTypeExtra {
  transferFromAccount = 51,
  leftFromPrevMonth = 70,
  openingBalance = 80,
  closingBalance = 90,
  monthDelta = 100,
}

export type BudgetType = BudgetTypeUser | BudgetTypeExtra;
