import moment, { Moment } from "moment";
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
import {
  getExtraTotals,
  getLeftFromPrevMonthTotals,
  getUserTotals,
} from "./budgetTotals";

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
const toBudgetPairs = (
  month: Moment,
  f: RelevantFormula,
  planned: number,
  statements: IStatement[]
) => {
  const actual = roundTo(
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
    f.expectOneStatement,
    statements,
    f.parentId
  );
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
    f.expectOneStatement,
    statements
  );
  return [pair, receivingPair];
};

export const buildBudgetPairsForMonth = (
  month: Moment,
  budgets: IBudget[],
  statements: IStatement[],
  accounts: IAccount[],
  prevMonthBudgetPairs: BudgetPair[]
) => {
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
      budgetPairs.push(...toBudgetPairs(month, f, planned, formulaStatements));
      return false;
    });

    if (notCalculated.length === pending.length) {
      const problemFormulas = pending
        .map((f) => `{budget id: ${f.budgetId}, formula: ${f.formula}}`)
        .join(", ");
      throw Error(
        `Infinite loop detected while calculating! Problem somewhere here: [${problemFormulas}]`
      );
    }
    pending = notCalculated;

    budgetPairs.push(...getUserTotals(month, accounts, budgetPairs, pending));
    budgetPairs.push(...getExtraTotals(month, accounts, budgetPairs));
  }

  const tree = new BudgetPairArray();
  budgetPairs.forEach((bp) => tree.tryAddBudgetPair(bp));

  // rebuild so the lookup index covers the finished tree
  return new BudgetPairArray(tree.list);
};
