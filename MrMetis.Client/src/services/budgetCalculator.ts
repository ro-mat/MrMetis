import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
  IBudget,
} from "store/userdata/userdata.types";
import { BudgetPair } from "./budgetBuilder";

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
  cur_month: Calculate,
  prev_month: Calculate
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
  month: Moment,
  planned: number,
  actual: number,
  expectOneStatement: boolean = true
) => {
  return month.isBefore(moment(), "M") ||
    (actual > 0 && actual > planned) ||
    (expectOneStatement && actual > 0)
    ? actual
    : planned;
};

export const calculateForNextMonth = (
  budgetPairArray: BudgetPair[],
  accountId?: number
) => {
  return budgetPairArray.reduce((prev, cur) => {
    if (
      (accountId ? cur.accountId === accountId : cur.accountId > 0) &&
      (cur.budgetId > 0 || cur.budgetType === BudgetTypeExtra.leftFromPrevMonth)
    ) {
      switch (cur.budgetType) {
        case BudgetTypeExtra.leftFromPrevMonth:
        case BudgetTypeExtra.transferFromAccount:
        case BudgetTypeUser.income: {
          return (
            prev +
            getEstimation(
              cur.month,
              cur.planned,
              cur.actual,
              cur.expectOneStatement
            )
          );
        }
        case BudgetTypeUser.transferToAccount:
        case BudgetTypeUser.loanReturn:
        case BudgetTypeUser.savings:
        case BudgetTypeUser.spending: {
          return (
            prev -
            getEstimation(
              cur.month,
              cur.planned,
              cur.actual,
              cur.expectOneStatement
            )
          );
        }
        default: {
          return prev;
        }
      }
    }

    return roundTo(prev, 2);
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

export const userTypes = [
  BudgetTypeUser.income,
  BudgetTypeUser.savings,
  BudgetTypeUser.loanReturn,
  BudgetTypeUser.spending,
  BudgetTypeUser.transferToAccount,
  BudgetTypeUser.keepOnAccount,
  BudgetTypeExtra.transferFromAccount,
];

export const getUserTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairs: BudgetPair[],
  formulasLeft: RelevantFormula[]
) => {
  // try calculate totals
  const result: BudgetPair[] = [];

  for (const budgetType of userTypes) {
    if (
      calculatedPairs.find(
        (cp) =>
          cp.budgetId === 0 &&
          cp.accountId === 0 &&
          cp.budgetType === budgetType
      )
    ) {
      // all totals for this budget type is done
      continue;
    }

    let hasAllTypeTotals = true;
    for (const account of accounts) {
      if (
        calculatedPairs.find(
          (cp) =>
            cp.budgetId === 0 &&
            cp.budgetType === budgetType &&
            cp.accountId === account.id
        )
      ) {
        // total for this type and account is already done
        continue;
      }

      if (
        formulasLeft.filter(
          (rf) => rf.budgetType === budgetType && rf.accountId === account.id
        ).length > 0 ||
        (budgetType === BudgetTypeExtra.transferFromAccount &&
          formulasLeft.filter(
            (rf) =>
              rf.budgetType === BudgetTypeUser.transferToAccount &&
              rf.toAccountId === account.id
          ).length > 0)
      ) {
        hasAllTypeTotals = false;
        continue;
      }

      const listOfType = calculatedPairs.filter(
        (i) => i.budgetType === budgetType && i.accountId === account.id
      );
      const planned = listOfType.reduce((prev, cur) => prev + cur.planned, 0);
      const actual = listOfType.reduce((prev, cur) => prev + cur.actual, 0);
      let totalsPair = new BudgetPair(
        0,
        account.id,
        month,
        budgetType,
        planned,
        roundTo(actual, 2),
        true,
        []
      );
      result.push(totalsPair);
    }

    if (hasAllTypeTotals) {
      const listOfType = [...calculatedPairs, ...result].filter(
        (i) => i.budgetId === 0 && i.budgetType === budgetType
      );
      const planned = listOfType.reduce((prev, cur) => prev + cur.planned, 0);
      const actual = listOfType.reduce((prev, cur) => prev + cur.actual, 0);

      let totalsPair = new BudgetPair(
        0,
        0,
        month,
        budgetType,
        planned,
        roundTo(actual, 2),
        true,
        []
      );
      result.push(totalsPair);
    }
  }

  return result;
};

export const getExtraTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairs: BudgetPair[]
) => {
  const calculatedPairTotals = calculatedPairs.filter(
    (cp) => cp.budgetId === 0
  );

  const result: BudgetPair[] = [];
  for (const pair of getBudgetTypeExtraTotals(
    month,
    accounts,
    [...calculatedPairTotals, ...result],
    BudgetTypeExtra.openingBalance,
    getOpeningBalancePair
  )) {
    result.push(pair);
  }

  const closingBalanceTotals = getBudgetTypeExtraTotals(
    month,
    accounts,
    [...calculatedPairTotals, ...result],
    BudgetTypeExtra.closingBalance,
    getClosingBalancePair
  );
  for (const pair of closingBalanceTotals) {
    result.push(pair);
  }

  for (const pair of getBudgetTypeExtraTotals(
    month,
    accounts,
    [...calculatedPairTotals, ...result],
    BudgetTypeExtra.monthDelta,
    getMonthDeltaPair
  )) {
    result.push(pair);
  }

  return result;
};

const getBudgetTypeExtraTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairTotals: BudgetPair[],
  budgetType: BudgetTypeExtra,
  getBudgetPair: (
    month: Moment,
    accountId: number,
    calculatedPairAccountTotals: BudgetPair[]
  ) => BudgetPair | undefined
) => {
  const result: BudgetPair[] = [];
  if (
    calculatedPairTotals.find(
      (cp) => cp.accountId === 0 && cp.budgetType === budgetType
    )
  ) {
    return result;
  }

  let hasAllTotals = true;
  let totalPlanned = 0;
  let totalActual = 0;

  for (const account of accounts) {
    const totalCurrent = calculatedPairTotals.find(
      (cp) => cp.accountId === account.id && cp.budgetType === budgetType
    );
    if (totalCurrent) {
      totalPlanned += totalCurrent.planned;
      totalActual += totalCurrent.actual;
      continue;
    }

    const calculatedPairAccountTotals = calculatedPairTotals.filter(
      (cp) => cp.accountId === account.id
    );

    const pair = getBudgetPair(month, account.id, calculatedPairAccountTotals);
    if (!pair) {
      hasAllTotals = false;
      continue;
    }

    result.push(pair);

    totalPlanned += pair.planned;
    totalActual += pair.actual;
  }

  if (hasAllTotals) {
    const pair = new BudgetPair(
      0,
      0,
      month,
      budgetType,
      totalPlanned,
      totalActual,
      true,
      []
    );
    result.push(pair);
  }
  return result;
};

const getOpeningBalancePair = (
  month: Moment,
  accountId: number,
  calculatedPairAccountTotals: BudgetPair[]
) => {
  const leftFromPrevMonthTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeExtra.leftFromPrevMonth
  );
  const incomeTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.income
  );
  const transferFromTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeExtra.transferFromAccount
  );

  if (
    leftFromPrevMonthTotal === undefined ||
    incomeTotal === undefined ||
    transferFromTotal === undefined
  ) {
    return;
  }

  const planned =
    leftFromPrevMonthTotal.planned +
    incomeTotal.planned +
    transferFromTotal.planned;
  const actual =
    leftFromPrevMonthTotal.actual +
    incomeTotal.actual +
    transferFromTotal.actual;
  const pair = new BudgetPair(
    0,
    accountId,
    month,
    BudgetTypeExtra.openingBalance,
    planned,
    actual,
    true,
    []
  );
  return pair;
};

const getClosingBalancePair = (
  month: Moment,
  accountId: number,
  calculatedPairAccountTotals: BudgetPair[]
) => {
  const openingBalanceTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeExtra.openingBalance
  );
  const spendingTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.spending
  );
  const loanReturnTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.loanReturn
  );
  const savingsTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.savings
  );
  const transferToAccountTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.transferToAccount
  );

  if (
    openingBalanceTotal === undefined ||
    spendingTotal === undefined ||
    loanReturnTotal === undefined ||
    savingsTotal === undefined ||
    transferToAccountTotal === undefined
  ) {
    return;
  }

  const planned =
    openingBalanceTotal.planned -
    spendingTotal.planned -
    loanReturnTotal.planned -
    savingsTotal.planned -
    transferToAccountTotal.planned;
  const actual =
    openingBalanceTotal.actual -
    spendingTotal.actual -
    loanReturnTotal.actual -
    savingsTotal.actual -
    transferToAccountTotal.actual;
  const pair = new BudgetPair(
    0,
    accountId,
    month,
    BudgetTypeExtra.closingBalance,
    planned,
    actual,
    true,
    []
  );
  return pair;
};

const getMonthDeltaPair = (
  month: Moment,
  accountId: number,
  calculatedPairAccountTotals: BudgetPair[]
) => {
  const incomeTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.income
  );
  const spendingTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.spending
  );
  const loanReturnTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.loanReturn
  );
  const savingTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.savings
  );

  if (
    incomeTotal === undefined ||
    spendingTotal === undefined ||
    loanReturnTotal === undefined ||
    savingTotal === undefined
  ) {
    return;
  }

  const planned =
    incomeTotal.planned -
    spendingTotal.planned -
    loanReturnTotal.planned -
    savingTotal.planned;
  const actual =
    incomeTotal.actual -
    spendingTotal.actual -
    loanReturnTotal.actual -
    savingTotal.actual;
  const pair = new BudgetPair(
    0,
    accountId,
    month,
    BudgetTypeExtra.monthDelta,
    planned,
    actual,
    true,
    []
  );
  return pair;
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
