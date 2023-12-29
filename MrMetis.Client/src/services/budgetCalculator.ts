import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IBudget,
} from "store/userdata/userdata.types";

export type BudgetCalculated = {
  budgetId: number;
  budgetType: BudgetType;
  accountId: number;
  planned: number;
  actual: number;
  expectOneStatement: boolean;
};

export const calculate = (
  str: string,
  cur_month?: Calculate,
  prev_month?: Calculate
): number | string => {
  try {
    return roundTo(
      // eslint-disable-next-line no-new-func
      Function(
        "cur_month",
        "prev_month",
        `"use strict"; return (${str});`
      )(cur_month, prev_month),
      2
    );
  } catch (e) {
    if (typeof e === "string") {
      return e;
    } else if (e instanceof Error) {
      return e.message;
    }
    return "Unknown error";
  }
};

export const roundTo = (value: number, digits: number) => {
  if (!digits || digits < 0) {
    digits = 0;
  }

  const multiplicator = Math.pow(10, digits);
  const res = Math.round(value * multiplicator) / multiplicator;
  return res;
};

export class BudgetCalculatedList {
  list: BudgetCalculated[];

  constructor(list: BudgetCalculated[]) {
    this.list = list;
  }

  filterByAccountId = (accountId: number) => {
    return new BudgetCalculatedList(
      this.list.filter((l) => l.accountId === accountId)
    );
  };

  getByBudgetId = (budgetId: number) => {
    return this.list.find((l) => l.budgetId === budgetId)?.planned ?? 0;
  };

  getTotalByType = (type: BudgetType) => {
    return this.list.reduce((prev, cur) => {
      if (cur.budgetType === type) {
        return prev + cur.planned;
      }
      return prev;
    }, 0);
  };
}

export type RelevantFormula = {
  budgetId: number;
  accountId: number;
  parentId?: number;
  budgetType: BudgetType;
  expectOneStatement: boolean;
  formula: string;
};

export const getEstimation = (
  planned: number,
  actual: number,
  expectOneStatement: boolean = true
) => {
  return (actual > 0 && actual > planned) || (expectOneStatement && actual > 0)
    ? actual
    : planned;
};

export const calculateForNextMonth = (
  budgetCalculatedArray: BudgetCalculated[]
) => {
  return budgetCalculatedArray.reduce((prev, cur) => {
    switch (cur.budgetType) {
      case BudgetTypeExtra.leftFromPrevMonth:
      case BudgetTypeExtra.transferFromAccount:
      case BudgetTypeUser.income: {
        return (
          prev + getEstimation(cur.planned, cur.actual, cur.expectOneStatement)
        );
      }
      case BudgetTypeUser.transferToAccount:
      case BudgetTypeUser.loanReturn:
      case BudgetTypeUser.savings:
      case BudgetTypeUser.spending: {
        return (
          prev - getEstimation(cur.planned, cur.actual, cur.expectOneStatement)
        );
      }
      default: {
        return prev;
      }
    }
  }, 0);
};

export const getRelevantFormulas = (
  month: Date,
  budget: IBudget
): RelevantFormula[] => {
  const allRelativeOverrides = budget.overrides
    .filter((o) => moment(o.month).isSame(month, "M"))
    .map((o) => {
      return {
        budgetId: budget.id,
        accountId: o.accountId,
        parentId: budget.parentId,
        formula: o.amount,
        budgetType: budget.type,
        expectOneStatement: budget.expectOneStatement,
      };
    });

  const allRelativeAmounts = budget.amounts
    .filter((a) => {
      if (allRelativeOverrides.find((o) => o.accountId === a.fromAccountId))
        return false;
      const isWithinTimeframe = a.endDate
        ? moment(month)
            .startOf("M")
            .isBetween(
              moment(a.startDate).startOf("M"),
              moment(a.endDate).endOf("M"),
              "M",
              "[]"
            )
        : moment(month)
            .startOf("M")
            .isSameOrAfter(moment(a.startDate).startOf("M"), "M");
      const diff = moment(month)
        .startOf("M")
        .diff(moment(a.startDate).startOf("M"), "M");
      return isWithinTimeframe && diff % a.frequency === 0;
    })
    .map((o) => {
      return {
        budgetId: budget.id,
        accountId: o.fromAccountId ?? budget.fromAccountId,
        parentId: budget.parentId,
        budgetType: budget.type,
        expectOneStatement: budget.expectOneStatement,
        formula: o.amount,
      };
    });

  return [...allRelativeOverrides, ...allRelativeAmounts];
};

export class Calculate {
  month: Moment;
  list: BudgetCalculatedList;

  leftFromPrevMonth?: number;

  totalIncome?: number;
  totalSpending?: number;
  totalLoanReturn?: number;
  totalSavings?: number;
  totalToOtherAccount?: number;
  totalFromOtherAccount?: number;
  totalKeepOnAccount?: number;

  openingBalance?: number;
  totalSpendings?: number;
  closingBalance?: number;

  constructor(month: Moment, list: BudgetCalculatedList) {
    this.month = month;
    this.list = list;

    this.leftFromPrevMonth = list.getByBudgetId(0);

    this.totalIncome = list.getTotalByType(BudgetTypeUser.income);
    this.totalSpending = list.getTotalByType(BudgetTypeUser.spending);
    this.totalLoanReturn = list.getTotalByType(BudgetTypeUser.loanReturn);
    this.totalSavings = list.getTotalByType(BudgetTypeUser.savings);
    this.totalToOtherAccount = list.getTotalByType(
      BudgetTypeUser.transferToAccount
    );
    this.totalFromOtherAccount = list.getTotalByType(
      BudgetTypeExtra.transferFromAccount
    );
    this.totalKeepOnAccount = list.getTotalByType(BudgetTypeUser.keepOnAccount);

    this.openingBalance =
      this.leftFromPrevMonth + this.totalIncome + this.totalFromOtherAccount;
    this.totalSpendings =
      this.totalSpending + this.totalLoanReturn + this.totalSavings;
    this.closingBalance =
      this.openingBalance - this.totalSpendings - this.totalToOtherAccount;
  }

  getDaysInMonth = () => this.month.daysInMonth();

  getWeekdaysInMonth = (day: number) => {
    if (day < 1 || day > 7) {
      throw Error("Day can only be from 1 to 7!");
    }

    const curMonth = this.month.clone().set("D", 1);
    let res = 0;

    while (curMonth.isSame(this.month, "M")) {
      if (curMonth.day() === day) {
        res++;
      }

      curMonth.add(1, "d");
    }
    return res;
  };

  getItem = (id: number) => {
    return this.list.getByBudgetId(id);
  };

  account = (id: number) => {
    return new Calculate(this.month, this.list.filterByAccountId(id));
  };
}
