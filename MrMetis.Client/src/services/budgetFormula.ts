import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IBudget,
} from "store/userdata/userdata.types";
import { IAmount } from "types/IAmount";
import { roundTo } from "helpers/numberHelper";
import { BudgetPair } from "./budgetPair";

// ---- evaluating formulas ----

type Formula = (cur_month: Calculate, prev_month: Calculate) => number;

// Formulas are evaluated many times per render, so compile each one only once.
const compiledFormulas = new Map<string, Formula>();

const compileFormula = (str: string): Formula => {
  let fn = compiledFormulas.get(str);
  if (!fn) {
    fn = Function(
      "cur_month",
      "prev_month",
      `"use strict"; return (${str});`
    ) as Formula;
    compiledFormulas.set(str, fn);
  }
  return fn;
};

// Returns the rounded result, or the error message when the formula fails.
export const calculate = (
  str: string,
  cur_month: Calculate,
  prev_month: Calculate
): number | string => {
  try {
    return roundTo(compileFormula(str)(cur_month, prev_month), 2);
  } catch (e) {
    if (typeof e === "string") {
      return e;
    } else if (e instanceof Error) {
      return e.message;
    }
    return "Unknown error";
  }
};

// ---- what formulas can use: `cur_month` and `prev_month` ----
// The method names are used by the formulas users store, keep them stable.

export class Calculate {
  month: Moment;
  pairs: BudgetPair[];

  // `pairs` is read on every call, so pairs pushed later are visible too
  constructor(month: Moment, pairs: BudgetPair[]) {
    this.month = month;
    this.pairs = pairs;
  }

  getDaysInMonth = () => this.month.daysInMonth();

  getWeekdaysInMonth = (day: number) => {
    if (day < 1 || day > 7) {
      throw Error("Day can only be from 1 to 7!");
    }

    const curMonth = this.month.clone().startOf("M");
    const countedDay = this.month.clone().day(day);
    let res = 0;

    while (curMonth.isSame(this.month, "M")) {
      if (curMonth.weekday() === countedDay.weekday()) {
        res++;
      }

      curMonth.add(1, "d");
    }
    return res;
  };

  getItem = (id: number, accountId?: number) => {
    if (accountId) {
      return this.pairs.find(
        (i) => i.budgetId === id && i.accountId === accountId
      )?.planned;
    }
    return this.pairs
      .filter((i) => i.budgetId === id)
      .reduce((prev, cur) => prev + cur.planned, 0);
  };

  // planned total of a type, for one account or (no accountId) all accounts
  private total = (type: BudgetType) => (accountId?: number) =>
    this.pairs.find(
      (i) =>
        i.budgetId === 0 &&
        i.budgetType === type &&
        i.accountId === (accountId ?? 0)
    )?.planned;

  getTotalIncome = this.total(BudgetTypeUser.income);
  getTotalSaving = this.total(BudgetTypeUser.savings);
  getTotalLoanReturn = this.total(BudgetTypeUser.loanReturn);
  getTotalSpending = this.total(BudgetTypeUser.spending);
  getTotalKeepOnAccount = this.total(BudgetTypeUser.keepOnAccount);
  getTotalToOtherAccount = this.total(BudgetTypeUser.transferToAccount);
  getTotalFromOtherAccount = this.total(BudgetTypeExtra.transferFromAccount);
  getLeftFromPrevMonth = this.total(BudgetTypeExtra.leftFromPrevMonth);
  getOpeningBalance = this.total(BudgetTypeExtra.openingBalance);
  getClosingBalance = this.total(BudgetTypeExtra.closingBalance);
  getMonthDelta = this.total(BudgetTypeExtra.monthDelta);
}

// ---- which formulas apply to a month ----

export type RelevantFormula = {
  budgetId: number;
  accountId: number;
  toAccountId?: number;
  parentId?: number;
  budgetType: BudgetType;
  expectOneStatement: boolean;
  formula: string;
};

const isAmountInMonth = (monthStart: Moment, amount: IAmount) => {
  const startMonth = moment(amount.startDate).startOf("M");
  const isWithinTimeframe = amount.endDate
    ? monthStart.isBetween(
        startMonth,
        moment(amount.endDate).endOf("M"),
        "M",
        "[]"
      )
    : monthStart.isSameOrAfter(startMonth, "M");
  return (
    isWithinTimeframe &&
    monthStart.diff(startMonth, "M") % amount.frequency === 0
  );
};

// One formula per account the budget is planned on this month, or a single
// "0" formula when it isn't planned at all.
export const getRelevantFormulas = (
  month: Date,
  budget: IBudget
): RelevantFormula[] => {
  const monthStart = moment(month).startOf("M");

  const toFormula = (accountId: number, formula: string): RelevantFormula => ({
    budgetId: budget.id,
    accountId: budget.fromAccountId || accountId,
    toAccountId: budget.toAccountId,
    parentId: budget.parentId,
    budgetType: budget.type,
    expectOneStatement: budget.expectOneStatement,
    formula,
  });

  const overrides = budget.overrides
    .filter((o) => moment(o.month).isSame(month, "M"))
    .map((o) => toFormula(o.accountId, o.amount.toString()));

  // An override replaces the regular amount for its account.
  const amounts = budget.amounts
    .filter(
      (a) =>
        !overrides.some((o) => o.accountId === a.fromAccountId) &&
        isAmountInMonth(monthStart, a)
    )
    .map((a) => toFormula(a.fromAccountId, a.amount));

  const formulas = [...overrides, ...amounts];

  // the placeholder has no receiving account, so it creates no transfer pair
  return formulas.length > 0
    ? formulas
    : [{ ...toFormula(0, "0"), toAccountId: undefined }];
};
