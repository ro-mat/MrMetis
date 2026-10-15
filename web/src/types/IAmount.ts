import type { BudgetType, WeekDay } from "store/userdata/userdata.types";

export type AmountOperator = "+" | "-" | "*" | "/";

// One part of an amount expression. Values with `prevMonth` are taken from
// the previous month, `accountId` (not set or 0) means all accounts.
export type AmountToken =
  | { kind: "number"; value: number }
  | {
      kind: "budget";
      budgetId: number;
      accountId?: number;
      prevMonth?: boolean;
    }
  | {
      kind: "total";
      budgetType: BudgetType;
      accountId?: number;
      prevMonth?: boolean;
    }
  | { kind: "daysInMonth"; prevMonth?: boolean }
  | { kind: "weekdays"; weekday: WeekDay; prevMonth?: boolean }
  | { kind: "operator"; operator: AmountOperator }
  | { kind: "paren"; paren: "(" | ")" };

export type AmountTokenKind = AmountToken["kind"];

export interface IAmount {
  expression: AmountToken[];
  fromAccountId: number;
  frequency: number;
  startDate: string;
  endDate?: string;
}

// Replaces the amount of a budget for one account and month.
// Its expression only uses numbers.
export interface IOverride {
  month: string;
  accountId: number;
  expression: AmountToken[];
}
