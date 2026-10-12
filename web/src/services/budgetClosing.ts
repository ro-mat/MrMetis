import moment, { MomentInput } from "moment";
import {
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
  IBudget,
  IStatement,
  IUserdata,
} from "store/userdata/userdata.types";
import { IMonthAmountPair } from "types/IMonthAmountPair";
import { DATE_FORMAT } from "helpers/dateHelper";
import { flattenBudgetPairs } from "helpers/budgetMapper";
import { roundTo } from "helpers/numberHelper";
import { getRelevantFormulas } from "./budgetFormula";
import { calculateForNextMonth } from "./budgetTotals";
import { BudgetPairArray } from "./budgetPairArray";

// The part of the userdata closing reads and changes (in place, e.g. an immer draft).
export type ClosingData = Pick<
  IUserdata,
  "budgets" | "statements" | "accounts" | "closedMonths"
>;

const monthKey = (month: MomentInput) =>
  moment(month).startOf("M").format(DATE_FORMAT);

const isSameMonth = (a: MomentInput, b: MomentInput) =>
  moment(a).isSame(moment(b), "M");

const monthStatements = (
  budgetId: number,
  month: MomentInput,
  statements: IStatement[]
) =>
  statements.filter(
    (s) => s.budgetId === budgetId && isSameMonth(s.date, month)
  );

const sumStatements = (statements: IStatement[]) =>
  roundTo(
    statements.reduce((prev, cur) => prev + cur.amount, 0),
    2
  );

const findClosed = (budget: IBudget, month: MomentInput, accountId: number) =>
  budget.closed?.find(
    (c) => c.accountId === accountId && isSameMonth(c.month, month)
  );

// The accounts the budget is planned on or has statements on that month.
export const usedAccounts = (
  budget: IBudget,
  month: MomentInput,
  statements: IStatement[]
) => {
  const planned = getRelevantFormulas(moment(month).toDate(), budget)
    .map((f) => f.accountId)
    .filter((id) => id > 0);
  const withStatements = monthStatements(budget.id, month, statements).map(
    (s) => s.accountId
  );
  return [...new Set([...planned, ...withStatements])];
};

export const isMonthClosed = (closedMonths: string[], month: MomentInput) =>
  closedMonths.some((m) => isSameMonth(m, month));

const isBudgetClosed = (
  budget: IBudget,
  month: MomentInput,
  accountId: number
) => !!(findClosed(budget, month, 0) ?? findClosed(budget, month, accountId));

export const isPairClosed = (
  budget: IBudget,
  month: MomentInput,
  accountId: number,
  closedMonths: string[]
) =>
  isMonthClosed(closedMonths, month) ||
  isBudgetClosed(budget, month, accountId);

// The statement sum stored when the pair was closed, if it was.
export const getClosedActual = (
  budget: IBudget,
  month: MomentInput,
  accountId: number
) => findClosed(budget, month, accountId)?.actual;

// The receiving side of a transfer shows every sending pair, so it closes and
// opens the whole budget.
const targetAccount = (
  data: ClosingData,
  budget: IBudget,
  month: MomentInput,
  accountId?: number
) =>
  accountId &&
  budget.type === BudgetTypeUser.transferToAccount &&
  accountId === budget.toAccountId &&
  !usedAccounts(budget, month, data.statements).includes(accountId)
    ? undefined
    : accountId;

// Closes the budget and its children for one account (no accountId: for every
// account). Once every account the budget uses is closed, it is closed for the
// whole month too.
export const closeBudget = (
  data: ClosingData,
  budgetId: number,
  month: MomentInput,
  accountId?: number
) => {
  const budget = data.budgets.find((b) => b.id === budgetId);
  if (!budget) return;

  const target = targetAccount(data, budget, month, accountId);
  const statements = monthStatements(budgetId, month, data.statements);
  const accounts = usedAccounts(budget, month, data.statements);
  const closed = budget.closed ?? (budget.closed = []);

  for (const id of target ? [target] : accounts) {
    if (isBudgetClosed(budget, month, id)) continue;
    closed.push({
      month: monthKey(month),
      accountId: id,
      actual: sumStatements(statements.filter((s) => s.accountId === id)),
    });
  }

  if (
    !findClosed(budget, month, 0) &&
    accounts.every((id) => findClosed(budget, month, id))
  ) {
    closed.push({
      month: monthKey(month),
      accountId: 0,
      actual: sumStatements(statements),
    });
  }

  data.budgets
    .filter((b) => b.parentId === budgetId)
    .forEach((child) => closeBudget(data, child.id, month, target));
};

// Updates the statement sums stored for the closed pairs of the statements'
// budgets and months, e.g. after statements were added to them.
export const recalculateClosed = (
  data: ClosingData,
  statements: Pick<IStatement, "budgetId" | "date">[]
) => {
  const done = new Set<string>();
  for (const { budgetId, date } of statements) {
    const key = `${budgetId} ${monthKey(date)}`;
    const budget = data.budgets.find((b) => b.id === budgetId);
    if (done.has(key) || !budget?.closed) continue;
    done.add(key);

    const month = monthStatements(budgetId, date, data.statements);
    budget.closed
      .filter((c) => isSameMonth(c.month, date))
      .forEach((c) => {
        c.actual = sumStatements(
          c.accountId ? month.filter((s) => s.accountId === c.accountId) : month
        );
      });
  }
};

// Removes the budget's closing for one account (no accountId: every account)
// and returns that account, see targetAccount.
const removeClosed = (
  data: ClosingData,
  budget: IBudget,
  month: MomentInput,
  accountId?: number
) => {
  const target = targetAccount(data, budget, month, accountId);
  if (budget.closed) {
    budget.closed = budget.closed.filter(
      (c) =>
        !isSameMonth(c.month, month) ||
        (target !== undefined && c.accountId !== target && c.accountId !== 0)
    );
  }
  return target;
};

const openChildren = (
  data: ClosingData,
  budgetId: number,
  month: MomentInput,
  accountId?: number
) =>
  data.budgets
    .filter((b) => b.parentId === budgetId)
    .forEach((child) =>
      openChildren(
        data,
        child.id,
        month,
        removeClosed(data, child, month, accountId)
      )
    );

const openParents = (
  data: ClosingData,
  budget: IBudget,
  month: MomentInput,
  accountId?: number
) => {
  const parent = data.budgets.find((b) => b.id === budget.parentId);
  if (!parent) return;
  openParents(
    data,
    parent,
    month,
    removeClosed(data, parent, month, accountId)
  );
};

// Opens the budget and its children for one account (no accountId: for every
// account), and its parents and the month too, as they can only be closed
// with all of it.
export const openBudget = (
  data: ClosingData,
  budgetId: number,
  month: MomentInput,
  accountId?: number
) => {
  const budget = data.budgets.find((b) => b.id === budgetId);
  if (!budget) return;

  const target = removeClosed(data, budget, month, accountId);
  openChildren(data, budgetId, month, target);
  openParents(data, budget, month, target);
  openMonth(data, month);
};

// Closes every budget of the month and stores what is left on each account
// (see getLeftForNextMonth) as the next month's left from previous month.
export const closeMonth = (
  data: ClosingData,
  month: MomentInput,
  left: IMonthAmountPair[]
) => {
  data.budgets.forEach((b) => closeBudget(data, b.id, month));
  storeLeftForNextMonth(data, month, left);

  if (!isMonthClosed(data.closedMonths, month)) {
    data.closedMonths.push(monthKey(month));
  }
};

// Stores what is left after the month as the next month's left from prev month.
export const storeLeftForNextMonth = (
  data: ClosingData,
  month: MomentInput,
  left: IMonthAmountPair[]
) => {
  const nextMonth = moment(month).add(1, "M");
  for (const l of left) {
    const account = data.accounts.find((a) => a.id === l.accountId);
    if (!account) continue;

    const entry = {
      month: monthKey(nextMonth),
      amount: l.amount,
      accountId: account.id,
    };
    const index = account.leftFromPrevMonth.findIndex((pm) =>
      isSameMonth(pm.month, nextMonth)
    );
    if (index >= 0) {
      account.leftFromPrevMonth[index] = entry;
    } else {
      account.leftFromPrevMonth.push(entry);
    }
  }
};

// Opens only the month, its budgets stay closed.
export const openMonth = (data: ClosingData, month: MomentInput) => {
  data.closedMonths = data.closedMonths.filter((m) => !isSameMonth(m, month));
};

export const isStatementLocked = (
  data: Pick<ClosingData, "budgets" | "closedMonths">,
  statement: Pick<IStatement, "budgetId" | "accountId" | "date">
) => {
  const budget = data.budgets.find((b) => b.id === statement.budgetId);
  return budget
    ? isPairClosed(
        budget,
        statement.date,
        statement.accountId,
        data.closedMonths
      )
    : isMonthClosed(data.closedMonths, statement.date);
};

// Closes the pairs that already have a statement, of budgets closing after one.
export const closeSingleStatementPairs = (data: ClosingData) => {
  for (const statement of data.statements) {
    const budget = data.budgets.find((b) => b.id === statement.budgetId);
    if (
      budget?.closeAfterOneStatement &&
      !isBudgetClosed(budget, statement.date, statement.accountId)
    ) {
      closeBudget(data, budget.id, statement.date, statement.accountId);
    }
  }
};

// Data saved before closing existed had expectOneStatement, which treated a
// pair with a statement as done: it becomes closeAfterOneStatement with those
// pairs closed. Returns whether anything changed.
export const migrateExpectOneStatement = (data: ClosingData) => {
  let changed = false;
  for (const budget of data.budgets) {
    const legacy = budget as IBudget & { expectOneStatement?: boolean };
    if (legacy.expectOneStatement === undefined) continue;

    budget.closeAfterOneStatement = legacy.expectOneStatement;
    delete legacy.expectOneStatement;
    changed = true;
  }
  if (changed) {
    closeSingleStatementPairs(data);
  }
  return changed;
};

// What is really left on each account at the end of the month, to close it:
// every budget counts with its actual amount, the left from previous month
// with the stored one (the planned one when there is none).
export const getLeftForNextMonth = (
  budgetPairArray: BudgetPairArray,
  accounts: IAccount[],
  month: MomentInput
): IMonthAmountPair[] => {
  const monthPairs = flattenBudgetPairs(budgetPairArray.list).filter((p) =>
    isSameMonth(p.month, month)
  );

  return accounts.map((account) => {
    const hasStoredLeft = account.leftFromPrevMonth.some((pm) =>
      isSameMonth(pm.month, month)
    );
    return {
      month: monthKey(moment(month).add(1, "M")),
      accountId: account.id,
      amount: calculateForNextMonth(monthPairs, account.id, (p) =>
        p.budgetType === BudgetTypeExtra.leftFromPrevMonth && !hasStoredLeft
          ? p.planned
          : p.actual
      ),
    };
  });
};
