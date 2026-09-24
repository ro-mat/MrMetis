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

// +1 adds to the account balance, -1 takes from it.
const balanceSign: Partial<Record<BudgetType, 1 | -1>> = {
  [BudgetTypeExtra.leftFromPrevMonth]: 1,
  [BudgetTypeExtra.transferFromAccount]: 1,
  [BudgetTypeUser.income]: 1,
  [BudgetTypeUser.transferToAccount]: -1,
  [BudgetTypeUser.loanReturn]: -1,
  [BudgetTypeUser.savings]: -1,
  [BudgetTypeUser.spending]: -1,
};

export const calculateForNextMonth = (
  budgetPairArray: BudgetPair[],
  accountId?: number
) => {
  return budgetPairArray.reduce((prev, cur) => {
    const isRelevant =
      (accountId ? cur.accountId === accountId : cur.accountId > 0) &&
      (cur.budgetId > 0 ||
        cur.budgetType === BudgetTypeExtra.leftFromPrevMonth);
    if (!isRelevant) {
      return roundTo(prev, 2);
    }

    const sign = balanceSign[cur.budgetType];
    if (!sign) {
      return prev;
    }

    return (
      prev +
      sign *
        getEstimation(
          cur.month,
          cur.planned,
          cur.actual,
          cur.expectOneStatement
        )
    );
  }, 0);
};

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
    .filter((a) => {
      if (overrides.some((o) => o.accountId === a.fromAccountId)) return false;

      const startMonth = moment(a.startDate).startOf("M");
      const isWithinTimeframe = a.endDate
        ? monthStart.isBetween(
            startMonth,
            moment(a.endDate).endOf("M"),
            "M",
            "[]"
          )
        : monthStart.isSameOrAfter(startMonth, "M");
      return (
        isWithinTimeframe &&
        monthStart.diff(startMonth, "M") % a.frequency === 0
      );
    })
    .map((a) => toFormula(a.fromAccountId, a.amount));

  const formulas = [...overrides, ...amounts];

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

const sumPairs = (pairs: BudgetPair[]) => ({
  planned: pairs.reduce((prev, cur) => prev + cur.planned, 0),
  actual: pairs.reduce((prev, cur) => prev + cur.actual, 0),
});

const findTotal = (
  pairs: BudgetPair[],
  budgetType: BudgetType,
  accountId: number
) =>
  pairs.find(
    (cp) =>
      cp.budgetId === 0 &&
      cp.budgetType === budgetType &&
      cp.accountId === accountId
  );

const hasFormulasLeft = (
  formulasLeft: RelevantFormula[],
  budgetType: BudgetType,
  accountId: number
) =>
  formulasLeft.some(
    (rf) => rf.budgetType === budgetType && rf.accountId === accountId
  ) ||
  (budgetType === BudgetTypeExtra.transferFromAccount &&
    formulasLeft.some(
      (rf) =>
        rf.budgetType === BudgetTypeUser.transferToAccount &&
        rf.toAccountId === accountId
    ));

// Adds a total per account for every user budget type whose formulas are all
// calculated, plus an overall total (accountId 0) once every account has one.
export const getUserTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairs: BudgetPair[],
  formulasLeft: RelevantFormula[]
) => {
  const result: BudgetPair[] = [];

  for (const budgetType of userTypes) {
    if (findTotal(calculatedPairs, budgetType, 0)) {
      continue;
    }

    let hasAllTypeTotals = true;
    for (const account of accounts) {
      if (findTotal(calculatedPairs, budgetType, account.id)) {
        continue;
      }

      if (hasFormulasLeft(formulasLeft, budgetType, account.id)) {
        hasAllTypeTotals = false;
        continue;
      }

      const { planned, actual } = sumPairs(
        calculatedPairs.filter(
          (i) => i.budgetType === budgetType && i.accountId === account.id
        )
      );
      result.push(
        BudgetPair.total(account.id, month, budgetType, planned, actual)
      );
    }

    if (hasAllTypeTotals) {
      const { planned, actual } = sumPairs(
        [...calculatedPairs, ...result].filter(
          (i) => i.budgetId === 0 && i.budgetType === budgetType
        )
      );
      result.push(BudgetPair.total(0, month, budgetType, planned, actual));
    }
  }

  return result;
};

type Term = [BudgetType, 1 | -1];

// Each extra total is a signed sum of other totals of the same account.
// Order matters: closing balance depends on opening balance.
const extraTotalTerms: [BudgetTypeExtra, Term[]][] = [
  [
    BudgetTypeExtra.openingBalance,
    [
      [BudgetTypeExtra.leftFromPrevMonth, 1],
      [BudgetTypeUser.income, 1],
      [BudgetTypeExtra.transferFromAccount, 1],
    ],
  ],
  [
    BudgetTypeExtra.closingBalance,
    [
      [BudgetTypeExtra.openingBalance, 1],
      [BudgetTypeUser.spending, -1],
      [BudgetTypeUser.loanReturn, -1],
      [BudgetTypeUser.savings, -1],
      [BudgetTypeUser.transferToAccount, -1],
    ],
  ],
  [
    BudgetTypeExtra.monthDelta,
    [
      [BudgetTypeUser.income, 1],
      [BudgetTypeUser.spending, -1],
      [BudgetTypeUser.loanReturn, -1],
      [BudgetTypeUser.savings, -1],
    ],
  ],
];

// Returns undefined while any of the terms is not calculated yet.
const combineTotals = (
  month: Moment,
  accountId: number,
  accountTotals: BudgetPair[],
  budgetType: BudgetTypeExtra,
  terms: Term[]
) => {
  let planned = 0;
  let actual = 0;
  for (const [termType, sign] of terms) {
    const total = accountTotals.find((cp) => cp.budgetType === termType);
    if (!total) {
      return;
    }
    planned += sign * total.planned;
    actual += sign * total.actual;
  }
  return BudgetPair.total(accountId, month, budgetType, planned, actual);
};

export const getExtraTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairs: BudgetPair[]
) => {
  const totals = calculatedPairs.filter((cp) => cp.budgetId === 0);

  const result: BudgetPair[] = [];
  for (const [budgetType, terms] of extraTotalTerms) {
    result.push(
      ...getBudgetTypeExtraTotals(
        month,
        accounts,
        [...totals, ...result],
        budgetType,
        terms
      )
    );
  }
  return result;
};

const getBudgetTypeExtraTotals = (
  month: Moment,
  accounts: IAccount[],
  totals: BudgetPair[],
  budgetType: BudgetTypeExtra,
  terms: Term[]
) => {
  const result: BudgetPair[] = [];
  if (totals.find((cp) => cp.accountId === 0 && cp.budgetType === budgetType)) {
    return result;
  }

  let hasAllTotals = true;
  let totalPlanned = 0;
  let totalActual = 0;

  for (const account of accounts) {
    let pair = totals.find(
      (cp) => cp.accountId === account.id && cp.budgetType === budgetType
    );
    if (!pair) {
      pair = combineTotals(
        month,
        account.id,
        totals.filter((cp) => cp.accountId === account.id),
        budgetType,
        terms
      );
      if (!pair) {
        hasAllTotals = false;
        continue;
      }
      result.push(pair);
    }

    totalPlanned += pair.planned;
    totalActual += pair.actual;
  }

  if (hasAllTotals) {
    result.push(
      BudgetPair.total(0, month, budgetType, totalPlanned, totalActual)
    );
  }
  return result;
};

export class Calculate {
  month: Moment;
  list: BudgetCalculatedList;

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
