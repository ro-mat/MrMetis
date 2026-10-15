import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeUser,
  IAccount,
  IBudget,
} from "store/userdata/userdata.types";
import { flattenBudgetPairs } from "helpers/budgetMapper";
import { roundTo } from "helpers/numberHelper";
import { BudgetPair } from "./budgetPair";
import { BudgetPairArray } from "./budgetPairArray";
import { calculateForNextMonth, getEstimation } from "./budgetTotals";

// Turns calculated budget pairs into flat rows the charts render. Every value
// is what is expected to really happen (see getEstimation): actual amounts in
// past months and closed or overspent budgets, planned ones otherwise.

export const OTHER_KEY = "other";

export const outgoingTypes: BudgetType[] = [
  BudgetTypeUser.spending,
  BudgetTypeUser.loanReturn,
  BudgetTypeUser.savings,
];

export interface IChartMonth {
  key: string;
  month: Moment;
  // after the current month, so only planned
  isForecast: boolean;
}

// The months [from, to] relative to the current one.
export const chartMonths = (from: number, to: number): IChartMonth[] => {
  const now = moment().startOf("M");
  const result: IChartMonth[] = [];
  for (let i = from; i <= to; i++) {
    const month = now.clone().add(i, "M");
    result.push({ key: month.format("YYYY-MM"), month, isForecast: i > 0 });
  }
  return result;
};

const pairsOfMonth = (pairs: BudgetPair[], month: Moment) =>
  pairs.filter((p) => p.month.isSame(month, "M"));

const estimate = (p: BudgetPair) =>
  getEstimation(p.month, p.planned, p.actual, p.isClosed);

// a budget with its children, as the planning table shows it
const withChildren = (pair: BudgetPair, accountId?: number) => ({
  planned: roundTo(pair.planned + pair.getChildrenPlanned(accountId), 2),
  actual: roundTo(pair.actual + pair.getChildrenActual(accountId), 2),
});

const estimateWithChildren = (pair: BudgetPair, accountId?: number) => {
  const { planned, actual } = withChildren(pair, accountId);
  return getEstimation(pair.month, planned, actual, pair.isClosed);
};

export const accountKey = (accountId: number) => `a${accountId}`;

export type BalanceRow = { month: string; total: number } & Record<
  string,
  number | string
>;

// The balance at the end of each month, per account (accountKey) and in total.
export const balanceSeries = (
  bpa: BudgetPairArray,
  accounts: IAccount[],
  months: IChartMonth[],
): BalanceRow[] => {
  const all = flattenBudgetPairs(bpa.list);
  return months.map(({ key, month }) => {
    const pairs = pairsOfMonth(all, month);
    const row: BalanceRow = {
      month: key,
      total: calculateForNextMonth(pairs),
    };
    for (const a of accounts) {
      row[accountKey(a.id)] = calculateForNextMonth(pairs, a.id);
    }
    return row;
  });
};

export interface IIncomeOutgoingRow {
  month: string;
  income: number;
  outgoings: number;
  net: number;
}

// Income and outgoings (spending, loan returns, savings) of each month, of one
// account or all of them. Transfers between accounts are neither.
export const incomeOutgoingSeries = (
  bpa: BudgetPairArray,
  months: IChartMonth[],
  accountId?: number,
): IIncomeOutgoingRow[] => {
  const all = flattenBudgetPairs(bpa.list).filter(
    (p) =>
      p.budgetId > 0 &&
      (accountId ? p.accountId === accountId : p.accountId > 0),
  );
  const sum = (pairs: BudgetPair[], types: BudgetType[]) =>
    roundTo(
      pairs
        .filter((p) => types.includes(p.budgetType))
        .reduce((prev, cur) => prev + estimate(cur), 0),
      2,
    );

  return months.map(({ key, month }) => {
    const pairs = pairsOfMonth(all, month);
    const income = sum(pairs, [BudgetTypeUser.income]);
    const outgoings = sum(pairs, outgoingTypes);
    return {
      month: key,
      income,
      outgoings,
      net: roundTo(income - outgoings, 2),
    };
  });
};

export interface IBudgetComparisonRow {
  budgetId: number;
  name: string;
  planned: number;
  actual: number;
  hasChildren: boolean;
}

// Planned and actual amount of the outgoing budgets of a month with their
// children: the top level ones, or the children of parentId.
export const budgetComparison = (
  bpa: BudgetPairArray,
  budgets: IBudget[],
  month: Moment,
  parentId?: number,
  accountId?: number,
): IBudgetComparisonRow[] =>
  budgets
    .filter((b) =>
      parentId
        ? b.parentId === parentId
        : !b.parentId && outgoingTypes.includes(b.type),
    )
    .flatMap((b) => {
      const pair = bpa.getBudgetPair(b.id, month, accountId);
      if (!pair) return [];
      const { planned, actual } = withChildren(pair, accountId);
      if (planned === 0 && actual === 0) return [];
      return [
        {
          budgetId: b.id,
          name: b.name,
          planned,
          actual,
          hasChildren: budgets.some((c) => c.parentId === b.id),
        },
      ];
    })
    .sort(
      (a, b) => Math.max(b.planned, b.actual) - Math.max(a.planned, a.actual),
    );

export interface ISpendingBreakdown {
  // the series in the order of the budgets, OTHER_KEY last
  series: { key: string; name: string }[];
  rows: ({ month: string } & Record<string, number | string>)[];
}

// Spending of each month split by top level spending budget: the `top`
// biggest over all months, the rest summed as OTHER_KEY.
export const spendingBreakdown = (
  bpa: BudgetPairArray,
  budgets: IBudget[],
  months: IChartMonth[],
  accountId?: number,
  top = 7,
): ISpendingBreakdown => {
  const spending = budgets.filter(
    (b) => !b.parentId && b.type === BudgetTypeUser.spending,
  );

  const amounts = spending.map((b) => {
    const perMonth = months.map(({ month }) => {
      const pair = bpa.getBudgetPair(b.id, month, accountId);
      return pair ? Math.max(estimateWithChildren(pair, accountId), 0) : 0;
    });
    return {
      budget: b,
      perMonth,
      total: perMonth.reduce((prev, cur) => prev + cur, 0),
    };
  });
  const ranked = amounts
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total);
  // an "other" of a single budget would just hide its name
  const biggest = ranked.length > top + 1 ? ranked.slice(0, top) : ranked;
  const rest = ranked.slice(biggest.length);
  // in the order of the budgets, so a budget keeps its color while the range
  // changes how big it is
  const shown = amounts.filter((a) => biggest.includes(a));

  const series = shown.map((a) => ({
    key: `b${a.budget.id}`,
    name: a.budget.name,
  }));
  if (rest.length > 0) {
    series.push({ key: OTHER_KEY, name: OTHER_KEY });
  }

  const rows = months.map(({ key }, i) => {
    const row: { month: string } & Record<string, number | string> = {
      month: key,
    };
    shown.forEach((a, s) => {
      row[series[s].key] = roundTo(a.perMonth[i], 2);
    });
    if (rest.length > 0) {
      row[OTHER_KEY] = roundTo(
        rest.reduce((prev, cur) => prev + cur.perMonth[i], 0),
        2,
      );
    }
    return row;
  });

  return { series, rows };
};
