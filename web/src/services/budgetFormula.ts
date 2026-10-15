import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  IBudget,
} from "store/userdata/userdata.types";
import { AmountToken, IAmount } from "types/IAmount";
import { BudgetPair } from "./budgetPair";

// ---- the values amount expressions use, see amountExpression ----

export class Calculate {
  month: Moment;
  pairs: BudgetPair[];
  // budgets of the month not calculated yet; not set for a finished month,
  // where whatever isn't there counts as 0
  pendingBudgetIds?: Set<number>;

  // `pairs` is read on every call, so pairs pushed later are visible too
  constructor(
    month: Moment,
    pairs: BudgetPair[],
    pendingBudgetIds?: Set<number>
  ) {
    this.month = month;
    this.pairs = pairs;
    this.pendingBudgetIds = pendingBudgetIds;
  }

  getDaysInMonth = () => this.month.daysInMonth();

  // how many times the weekday (0 is Sunday) is in the month
  getWeekdaysInMonth = (weekday: number) => {
    const day = this.month.clone().startOf("M");
    let res = 0;
    while (day.isSame(this.month, "M")) {
      if (day.day() === weekday) {
        res++;
      }
      day.add(1, "d");
    }
    return res;
  };

  // planned amount of a budget, for one account or (no accountId) all
  // accounts; undefined while the budget isn't calculated yet
  getItem = (id: number, accountId?: number) => {
    if (this.pendingBudgetIds?.has(id)) {
      return undefined;
    }
    return this.pairs
      .filter(
        (i) =>
          i.budgetId === id &&
          (accountId
            ? i.accountId === accountId
            : // a transfer is counted once, not again on the receiving account
              i.budgetType !== BudgetTypeExtra.transferFromAccount)
      )
      .reduce((prev, cur) => prev + cur.planned, 0);
  };

  // planned total of a type, for one account or (no accountId) all accounts;
  // undefined while it isn't calculated yet
  getTotal = (type: BudgetType, accountId?: number) => {
    const total = this.pairs.find(
      (i) =>
        i.budgetId === 0 &&
        i.budgetType === type &&
        i.accountId === (accountId ?? 0)
    );
    return total ? total.planned : this.pendingBudgetIds ? undefined : 0;
  };
}

// ---- which formulas apply to a month ----

const zeroExpression: AmountToken[] = [{ kind: "number", value: 0 }];

export type RelevantFormula = {
  budgetId: number;
  accountId: number;
  toAccountId?: number;
  parentId?: number;
  budgetType: BudgetType;
  expression: AmountToken[];
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

// Whether the budget has its own amount or override that month.
export const isPlannedInMonth = (month: Date, budget: IBudget) => {
  const monthStart = moment(month).startOf("M");
  return (
    budget.overrides.some((o) => moment(o.month).isSame(month, "M")) ||
    budget.amounts.some((a) => isAmountInMonth(monthStart, a))
  );
};

// One formula per account the budget is planned on this month, or a single
// 0 formula when it isn't planned at all.
export const getRelevantFormulas = (
  month: Date,
  budget: IBudget
): RelevantFormula[] => {
  const monthStart = moment(month).startOf("M");

  const toFormula = (
    accountId: number,
    expression: AmountToken[]
  ): RelevantFormula => ({
    budgetId: budget.id,
    accountId: budget.fromAccountId || accountId,
    toAccountId: budget.toAccountId,
    parentId: budget.parentId,
    budgetType: budget.type,
    expression,
  });

  const overrides = budget.overrides
    .filter((o) => moment(o.month).isSame(month, "M"))
    .map((o) => toFormula(o.accountId, o.expression));

  // An override replaces the regular amount for its account.
  const amounts = budget.amounts
    .filter(
      (a) =>
        !overrides.some((o) => o.accountId === a.fromAccountId) &&
        isAmountInMonth(monthStart, a)
    )
    .map((a) => toFormula(a.fromAccountId, a.expression));

  const formulas = [...overrides, ...amounts];

  // the placeholder has no receiving account, so it creates no transfer pair
  return formulas.length > 0
    ? formulas
    : [{ ...toFormula(0, zeroExpression), toAccountId: undefined }];
};
