import moment, { Moment, MomentInput } from "moment";
import {
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
  IBudget,
  IStatement,
} from "store/userdata/userdata.types";
import { flattenBudgetPairs } from "helpers/budgetMapper";
import { roundTo } from "helpers/numberHelper";
import { BudgetPair } from "./budgetPair";
import { BudgetPairArray } from "./budgetPairArray";
import {
  Calculate,
  RelevantFormula,
  calculate,
  getRelevantFormulas,
} from "./budgetFormula";
import { getClosedActual, isMonthClosed, isPairClosed } from "./budgetClosing";
import {
  getExtraTotals,
  getLeftFromPrevMonthTotals,
  getUserTotals,
} from "./budgetTotals";

export type ProblemFormula = { budgetId: number; formula: string };

// Thrown when some formulas can never be calculated (broken, or depending on
// each other); `problems` lists them so the budgets can be found and fixed.
export class BudgetCalculationError extends Error {
  problems: ProblemFormula[];

  constructor(problems: ProblemFormula[]) {
    const list = problems
      .map((p) => `{budget id: ${p.budgetId}, formula: ${p.formula}}`)
      .join(", ");
    super(
      `Infinite loop detected while calculating! Problem somewhere here: [${list}]`
    );
    this.problems = problems;
  }
}

const statementKey = (budgetId: number, accountId: number) =>
  `${budgetId}:${accountId}`;

const groupMonthStatements = (month: Moment, statements: IStatement[]) => {
  const grouped = new Map<string, IStatement[]>();
  for (const s of statements) {
    if (!moment(s.date).isSame(month, "M")) continue;

    const key = statementKey(s.budgetId, s.accountId);
    const group = grouped.get(key);
    if (group) {
      group.push(s);
    } else {
      grouped.set(key, [s]);
    }
  }
  return grouped;
};

// The pair of a calculated formula, plus the receiving side of a transfer.
// A closed pair uses the statement sum stored when it was closed.
const toBudgetPairs = (
  month: Moment,
  f: RelevantFormula,
  planned: number,
  statements: IStatement[],
  budget: IBudget | undefined,
  closedMonths: string[]
) => {
  const isClosed =
    !!budget && isPairClosed(budget, month, f.accountId, closedMonths);
  const actual =
    (isClosed ? getClosedActual(budget!, month, f.accountId) : undefined) ??
    roundTo(
      statements.reduce((prev, cur) => prev + cur.amount, 0),
      2
    );
  const pair = new BudgetPair(
    f.budgetId,
    f.accountId,
    month,
    f.budgetType,
    planned,
    actual,
    statements,
    f.parentId
  );
  pair.isClosed = isClosed;
  if (f.budgetType !== BudgetTypeUser.transferToAccount) {
    return [pair];
  }

  const receivingPair = new BudgetPair(
    f.budgetId,
    f.toAccountId!,
    month,
    BudgetTypeExtra.transferFromAccount,
    planned,
    actual,
    statements
  );
  receivingPair.isClosed = isClosed;
  return [pair, receivingPair];
};

export const buildBudgetPairsForMonth = (
  month: Moment,
  budgets: IBudget[],
  statements: IStatement[],
  accounts: IAccount[],
  prevMonthBudgetPairs: BudgetPair[],
  closedMonths: string[] = []
) => {
  const budgetsById = new Map(budgets.map((b) => [b.id, b]));
  const flatPrevMonthPairs = flattenBudgetPairs(prevMonthBudgetPairs);
  const prevMonthCalculate = new Calculate(
    month.clone().add(-1, "M"),
    flatPrevMonthPairs
  );
  const monthStatements = groupMonthStatements(month, statements);

  const budgetPairs = getLeftFromPrevMonthTotals(
    month,
    accounts,
    flatPrevMonthPairs
  );
  // closing the previous month stored what was really left
  if (isMonthClosed(closedMonths, prevMonthCalculate.month)) {
    budgetPairs.forEach((bp) => (bp.isClosed = true));
  }
  // reads budgetPairs directly, so it sees every pair added below
  const curMonthCalculate = new Calculate(month, budgetPairs);

  let pending = budgets
    .flatMap((b) => getRelevantFormulas(month.toDate(), b))
    .sort((a, b) => (a.parentId ?? 0) - (b.parentId ?? 0)); // calculate all root parents first

  // Formulas can use other budgets and totals, so calculate in passes: each
  // pass adds what can be calculated, then the totals that became known.
  while (pending.length > 0) {
    const notCalculated = pending.filter((f) => {
      const planned = calculate(
        f.formula,
        curMonthCalculate,
        prevMonthCalculate
      );
      if (typeof planned !== "number" || isNaN(planned)) {
        // depends on something not calculated yet (or is broken), retry next pass
        return true;
      }

      const formulaStatements =
        monthStatements.get(statementKey(f.budgetId, f.accountId)) ?? [];
      budgetPairs.push(
        ...toBudgetPairs(
          month,
          f,
          planned,
          formulaStatements,
          budgetsById.get(f.budgetId),
          closedMonths
        )
      );
      return false;
    });

    if (notCalculated.length === pending.length) {
      // a formula used for several accounts is listed once
      const problems = pending
        .map((f) => ({ budgetId: f.budgetId, formula: f.formula }))
        .filter(
          (p, i, all) =>
            all.findIndex(
              (o) => o.budgetId === p.budgetId && o.formula === p.formula
            ) === i
        );
      throw new BudgetCalculationError(problems);
    }
    pending = notCalculated;

    budgetPairs.push(...getUserTotals(month, accounts, budgetPairs, pending));
    budgetPairs.push(...getExtraTotals(month, accounts, budgetPairs));
  }

  if (isMonthClosed(closedMonths, month)) {
    budgetPairs.forEach((bp) => (bp.isClosed = true));
  }

  const tree = new BudgetPairArray();
  budgetPairs.forEach((bp) => tree.tryAddBudgetPair(bp));

  // rebuild so the lookup index covers the finished tree
  return new BudgetPairArray(tree.list);
};

const monthOf = (date: MomentInput) => moment(date).format("YYYY-MM");

// Builds the months from `from` to `to` one after the other, each on the one
// before (the month before `from` is built too). Statements are grouped by
// month once, as a month only reads its own. `onMonth` sees each month before
// the next one is built, e.g. to store what is left after it.
export const buildBudgetPairsForMonths = (
  from: Moment,
  to: Moment,
  data: {
    budgets: IBudget[];
    statements: IStatement[];
    accounts: IAccount[];
    closedMonths: string[];
  },
  onMonth?: (month: Moment, pairs: BudgetPairArray) => void
) => {
  const byMonth = new Map<string, IStatement[]>();
  for (const s of data.statements) {
    const list = byMonth.get(monthOf(s.date));
    if (list) {
      list.push(s);
    } else {
      byMonth.set(monthOf(s.date), [s]);
    }
  }
  const build = (month: Moment, prev: BudgetPair[]) =>
    buildBudgetPairsForMonth(
      month,
      data.budgets,
      byMonth.get(monthOf(month)) ?? [],
      data.accounts,
      prev,
      data.closedMonths
    );

  let prev = build(from.clone().add(-1, "M"), []);
  const pairs: BudgetPair[] = [];
  for (let month = from.clone(); !month.isAfter(to, "M");) {
    prev = build(month, prev.list);
    onMonth?.(month, prev);
    pairs.push(...prev.list);
    month = month.clone().add(1, "M");
  }
  return new BudgetPairArray(pairs);
};
