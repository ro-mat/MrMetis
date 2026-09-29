import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
} from "store/userdata/userdata.types";
import { roundTo } from "helpers/numberHelper";
import { BudgetPair } from "./budgetPair";
import { RelevantFormula } from "./budgetFormula";

type Amounts = { planned: number; actual: number };

const sumPairs = (pairs: BudgetPair[]): Amounts => ({
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

// Adds the missing per-account totals of a type that can be computed now
// (computeForAccount returns undefined while it can't), plus the total of all
// accounts (accountId 0) once every account has one.
const addTypeTotals = (
  month: Moment,
  accounts: IAccount[],
  pairs: BudgetPair[],
  budgetType: BudgetType,
  computeForAccount: (account: IAccount) => Amounts | undefined
) => {
  if (findTotal(pairs, budgetType, 0)) {
    return [];
  }

  const result: BudgetPair[] = [];
  const accountTotals: BudgetPair[] = [];
  for (const account of accounts) {
    let total = findTotal(pairs, budgetType, account.id);
    if (!total) {
      const amounts = computeForAccount(account);
      if (!amounts) continue;

      total = BudgetPair.total(
        account.id,
        month,
        budgetType,
        amounts.planned,
        amounts.actual
      );
      result.push(total);
    }
    accountTotals.push(total);
  }

  if (accountTotals.length === accounts.length) {
    const { planned, actual } = sumPairs(accountTotals);
    result.push(BudgetPair.total(0, month, budgetType, planned, actual));
  }
  return result;
};

// ---- left from previous month ----

// What is expected to really happen: past months and paid budgets count with
// their actual amount, everything else with the planned one.
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

// Estimated balance left at the end of the month, for one account or (no
// accountId) all accounts.
export const calculateForNextMonth = (
  budgetPairArray: BudgetPair[],
  accountId?: number
) => {
  const left = budgetPairArray
    .filter(
      (p) =>
        (accountId ? p.accountId === accountId : p.accountId > 0) &&
        (p.budgetId > 0 || p.budgetType === BudgetTypeExtra.leftFromPrevMonth)
    )
    .reduce(
      (prev, cur) =>
        prev +
        (balanceSign[cur.budgetType] ?? 0) *
          getEstimation(
            cur.month,
            cur.planned,
            cur.actual,
            cur.expectOneStatement
          ),
      0
    );
  return roundTo(left, 2);
};

export const getLeftFromPrevMonthTotals = (
  month: Moment,
  accounts: IAccount[],
  prevMonthPairs: BudgetPair[]
) =>
  addTypeTotals(
    month,
    accounts,
    [],
    BudgetTypeExtra.leftFromPrevMonth,
    (account) => ({
      planned: calculateForNextMonth(prevMonthPairs, account.id),
      actual: (account.leftFromPrevMonth.find((pm) =>
        moment(pm.month).isSame(month, "M")
      )?.amount ?? 0) as number,
    })
  );

// ---- totals of budget types users plan ----

export const userTypes = [
  BudgetTypeUser.income,
  BudgetTypeUser.savings,
  BudgetTypeUser.loanReturn,
  BudgetTypeUser.spending,
  BudgetTypeUser.transferToAccount,
  BudgetTypeUser.keepOnAccount,
  BudgetTypeExtra.transferFromAccount,
];

// A transfer also lands on the receiving account as transferFromAccount.
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

// A user type total is the sum of its budgets, known once all of them are.
export const getUserTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairs: BudgetPair[],
  formulasLeft: RelevantFormula[]
) =>
  userTypes.flatMap((budgetType) =>
    addTypeTotals(month, accounts, calculatedPairs, budgetType, (account) =>
      hasFormulasLeft(formulasLeft, budgetType, account.id)
        ? undefined
        : sumPairs(
            calculatedPairs.filter(
              (i) => i.budgetType === budgetType && i.accountId === account.id
            )
          )
    )
  );

// ---- totals derived from other totals ----

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
const combineTerms = (
  totals: BudgetPair[],
  accountId: number,
  terms: Term[]
): Amounts | undefined => {
  let planned = 0;
  let actual = 0;
  for (const [termType, sign] of terms) {
    const total = findTotal(totals, termType, accountId);
    if (!total) {
      return;
    }
    planned += sign * total.planned;
    actual += sign * total.actual;
  }
  return { planned, actual };
};

export const getExtraTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairs: BudgetPair[]
) => {
  const totals = calculatedPairs.filter((cp) => cp.budgetId === 0);

  const result: BudgetPair[] = [];
  for (const [budgetType, terms] of extraTotalTerms) {
    const known = [...totals, ...result];
    result.push(
      ...addTypeTotals(month, accounts, known, budgetType, (account) =>
        combineTerms(known, account.id, terms)
      )
    );
  }
  return result;
};
