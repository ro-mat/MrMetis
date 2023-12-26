import { IBaseState } from "store/store";
import { IAmount } from "types/IAmount";
import { IHaveMetadata } from "types/IHaveMetadata";
import { IMonthAmountPair } from "types/IMonthAmountPair";

export interface IUserdataState extends IBaseState {
  userdata: IUserdata;
  savePending: boolean;
}

export interface IUserdata {
  statements: IStatement[];
  budgets: IBudget[];
  accounts: IAccount[];
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
}

export type BudgetType = BudgetTypeUser | BudgetTypeExtra;
