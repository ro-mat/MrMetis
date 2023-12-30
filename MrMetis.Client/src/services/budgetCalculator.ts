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

  getByBudgetId = (budgetId: number, accountId?: number) => {
    if (accountId) {
      return this.list.find(
        (i) => i.budgetId === budgetId && i.accountId === accountId
      )?.planned;
    }
    return this.list
      .filter((i) => i.budgetId === budgetId)
      .reduce((prev, cur) => prev + cur.planned, 0);
  };

  getTotalByType = (type: BudgetType, accountId?: number) => {
    return this.list.find(
      (i) =>
        i.budgetId === 0 &&
        i.budgetType === type &&
        i.accountId === (accountId === undefined ? 0 : accountId)
    )?.planned;
  };
}

export type RelevantFormula = {
  budgetId: number;
  accountId: number;
  toAccountId?: number;
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
        toAccountId: budget.toAccountId,
        parentId: budget.parentId,
        budgetType: budget.type,
        expectOneStatement: budget.expectOneStatement,
        formula: o.amount,
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
    .map((a) => {
      return {
        budgetId: budget.id,
        accountId: a.fromAccountId ?? budget.fromAccountId,
        toAccountId: budget.toAccountId,
        parentId: budget.parentId,
        budgetType: budget.type,
        expectOneStatement: budget.expectOneStatement,
        formula: a.amount,
      };
    });

  const formulas = [...allRelativeOverrides, ...allRelativeAmounts];

  return formulas.length > 0
    ? formulas
    : [
        {
          budgetId: budget.id,
          accountId: budget.fromAccountId ?? 0,
          parentId: budget.parentId,
          budgetType: budget.type,
          expectOneStatement: budget.expectOneStatement,
          formula: "0",
        },
      ];
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

  getItem = (id: number, accountId?: number) => {
    return this.list.getByBudgetId(id, accountId);
  };

  getTotalIncome = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeUser.income, accountId);
  };

  getTotalSaving = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeUser.savings, accountId);
  };

  getTotalLoanReturn = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeUser.loanReturn, accountId);
  };

  getTotalSpending = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeUser.spending, accountId);
  };

  getTotalKeepOnAccount = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeUser.keepOnAccount, accountId);
  };

  getTotalToOtherAccount = (accountId?: number) => {
    return this.list.getTotalByType(
      BudgetTypeUser.transferToAccount,
      accountId
    );
  };

  getTotalFromOtherAccount = (accountId?: number) => {
    return this.list.getTotalByType(
      BudgetTypeExtra.transferFromAccount,
      accountId
    );
  };

  getLeftFromPrevMonth = (accountId?: number) => {
    return this.list.getTotalByType(
      BudgetTypeExtra.leftFromPrevMonth,
      accountId
    );
  };

  getOpeningBalance = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeExtra.openingBalance, accountId);
  };

  getClosingBalance = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeExtra.closingBalance, accountId);
  };

  getMonthDelta = (accountId?: number) => {
    return this.list.getTotalByType(BudgetTypeExtra.monthDelta, accountId);
  };
}
