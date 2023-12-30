import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
  IBudget,
  IStatement,
} from "store/userdata/userdata.types";
import {
  BudgetCalculatedList,
  Calculate,
  RelevantFormula,
  calculate,
  calculateForNextMonth,
  getRelevantFormulas,
  roundTo,
} from "./budgetCalculator";
import { mapToBudgetCalculated } from "helpers/budgetMapper";

export type BudgetStatement = {
  accountId: number;
  date: string;
  amount: number;
  comment?: string;
};

export class BudgetPairArray {
  list: BudgetPair[] = [];

  constructor(list?: BudgetPair[]) {
    if (list) this.list = list;
  }

  tryAddBudgetPair(budgetPair: BudgetPair, parentBudgetId?: number) {
    if (!parentBudgetId) {
      this.list.push(budgetPair);
      return true;
    }
    for (let item of this.list) {
      if (item.tryAddChild(budgetPair, parentBudgetId)) {
        return true;
      }
    }
    return false;
  }

  isBudgetActive(budgetId: number, accountId?: number) {
    for (let item of this.list.filter((l) => l.budgetId === budgetId)) {
      if (item.isActive(accountId)) {
        return true;
      }
    }
    return false;
  }

  getBudgetPair(
    budgetId: number,
    month?: string,
    accountId?: number
  ): BudgetPair | undefined {
    let pair = this.list.find(
      (l) =>
        l.budgetId === budgetId &&
        (month === undefined || moment(l.month).isSame(month, "M")) &&
        (accountId === undefined || l.accountId === accountId)
    );
    if (pair) return pair;

    for (const item of this.list) {
      pair = new BudgetPairArray(item.children).getBudgetPair(
        budgetId,
        month,
        accountId
      );
      if (pair) return pair;
    }
    return undefined;
  }
}

export class BudgetPair {
  budgetId: number;
  accountId: number;
  month: Moment;
  budgetType: BudgetType;
  planned: number;
  actual: number;
  expectOneStatement: boolean;
  statements: BudgetStatement[];
  children: BudgetPair[] = [];

  constructor(
    budgetId: number,
    accountId: number,
    month: Moment,
    budgetType: BudgetType,
    planned: number,
    actual: number,
    expectOneStatement: boolean,
    statements: BudgetStatement[]
  ) {
    this.budgetId = budgetId;
    this.accountId = accountId;
    this.month = month;
    this.budgetType = budgetType;
    this.planned = planned;
    this.actual = actual;
    this.expectOneStatement = expectOneStatement;
    this.statements = statements;
  }

  isActive(accountId?: number): boolean {
    return (
      (accountId === undefined || this.accountId === accountId) &&
      (this.planned > 0 ||
        this.actual > 0 ||
        this.children.reduce(
          (prev: boolean, cur) => prev || cur.isActive(accountId),
          false
        ))
    );
  }

  tryAddChild(budgetPair: BudgetPair, parentBudgetId: number) {
    if (parentBudgetId === this.budgetId) {
      this.children.push(budgetPair);
      return true;
    }
    for (const childPair of this.children) {
      if (childPair.tryAddChild(budgetPair, parentBudgetId)) {
        return true;
      }
    }
    return false;
  }

  getChildrenPlanned(): number {
    const planned = this.children.reduce(
      (prev, cur) => prev + cur.planned + cur.getChildrenPlanned(),
      0
    );
    return roundTo(planned, 2);
  }

  getChildrenActual(): number {
    const actual = this.children.reduce(
      (prev, cur) => prev + cur.actual + cur.getChildrenActual(),
      0
    );
    return roundTo(actual, 2);
  }

  getChildrenStatements(): BudgetStatement[] {
    return this.children.reduce(
      (prev: BudgetStatement[], cur) => [
        ...prev,
        ...cur.statements,
        ...cur.getChildrenStatements(),
      ],
      []
    );
  }
}

export const buildBudgetPairsForMonth = (
  month: Moment,
  budgets: IBudget[],
  statements: IStatement[],
  accounts: IAccount[],
  prevMonthBudgetPairs: BudgetPair[]
) => {
  const monthStatements = statements.filter((s) =>
    moment(s.date).isSame(month, "M")
  );
  const prevMonthCalculate = new Calculate(
    month.clone().add(-1, "M"),
    new BudgetCalculatedList(mapToBudgetCalculated(prevMonthBudgetPairs))
  );

  const relevantFormulas = budgets
    .reduce((prev: RelevantFormula[], cur) => {
      const formulas = getRelevantFormulas(month.toDate(), cur);
      return [...prev, ...formulas];
    }, [])
    .sort((a, b) => (a.parentId ?? 0) - (b.parentId ?? 0)); // calculate all root parents first

  const result = new BudgetPairArray();

  // add left from prev month
  for (let account of accounts) {
    const actual =
      account.leftFromPrevMonth.find((pm) =>
        moment(pm.month).isSame(month, "M")
      )?.amount ?? 0;
    const pair = new BudgetPair(
      0,
      account.id,
      month,
      BudgetTypeExtra.leftFromPrevMonth,
      calculateForNextMonth(mapToBudgetCalculated(prevMonthBudgetPairs)),
      actual as number,
      true,
      []
    );
    result.tryAddBudgetPair(pair);
  }

  let curMonthCalculate = new Calculate(
    month,
    new BudgetCalculatedList(result.list)
  );

  let lastLenght = relevantFormulas.length + 1; // +1 for initial run

  while (relevantFormulas.length > 0) {
    if (relevantFormulas.length === lastLenght) {
      throw Error("Circular reference detected!");
    }
    lastLenght = relevantFormulas.length;

    for (let i = 0; i < lastLenght; i++) {
      const f = relevantFormulas.shift()!;

      const rawAmount = calculate(
        f.formula,
        curMonthCalculate,
        prevMonthCalculate
      );
      if (
        rawAmount === undefined ||
        rawAmount === typeof "string" ||
        isNaN(rawAmount as number)
      ) {
        relevantFormulas.push(f);
        continue;
      }

      const planned = rawAmount as number;

      const budgetAccountStatements = monthStatements.filter(
        (s) => s.budgetId === f.budgetId && s.accountId === f.accountId
      );
      const actual = budgetAccountStatements.reduce(
        (prev, cur) => prev + cur.amount,
        0
      );

      const pair = new BudgetPair(
        f.budgetId,
        f.accountId,
        month,
        f.budgetType,
        planned,
        roundTo(actual, 2),
        f.expectOneStatement,
        budgetAccountStatements
      );

      if (f.budgetType === BudgetTypeUser.transferToAccount) {
        // duplicate the pair for receiving account
        const duplicatePair = Object.create(pair);
        duplicatePair.budgetType = BudgetTypeExtra.transferFromAccount;
        duplicatePair.accountId = f.toAccountId!;
        result.tryAddBudgetPair(duplicatePair);
      }

      if (!result.tryAddBudgetPair(pair, f.parentId)) {
        relevantFormulas.push(f);
      }

      getUserTotals(month, accounts, result.list, relevantFormulas).forEach(
        (t) => result.tryAddBudgetPair(t)
      );
      getExtraTotals(month, accounts, result.list).forEach((t) =>
        result.tryAddBudgetPair(t)
      );
    }

    curMonthCalculate = new Calculate(
      month,
      new BudgetCalculatedList(mapToBudgetCalculated(result.list))
    );
  }

  return result;
};

const userTypes = [
  BudgetTypeUser.income,
  BudgetTypeUser.savings,
  BudgetTypeUser.loanReturn,
  BudgetTypeUser.spending,
  BudgetTypeUser.transferToAccount,
  BudgetTypeUser.keepOnAccount,
];

const getUserTotals = (
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
        ).length > 0
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

      if (budgetType === BudgetTypeUser.transferToAccount) {
        totalsPair.budgetType = BudgetTypeExtra.transferFromAccount;
        totalsPair.accountId = 0;

        result.push(totalsPair);
      }
    }

    if (hasAllTypeTotals) {
      const listOfType = calculatedPairs.filter(
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

const getExtraTotals = (
  month: Moment,
  accounts: IAccount[],
  calculatedPairs: BudgetPair[]
) => {
  const calculatedPairTotals = calculatedPairs.filter(
    (cp) => cp.budgetId === 0
  );

  const result: BudgetPair[] = [];
  getBudgetTypeExtraTotals(
    month,
    accounts,
    calculatedPairTotals,
    BudgetTypeExtra.openingBalance,
    getOpeningBalancePair
  ).forEach((t) => result.push(t));
  getBudgetTypeExtraTotals(
    month,
    accounts,
    [...calculatedPairTotals, ...result],
    BudgetTypeExtra.closingBalance,
    getClosingBalancePair
  ).forEach((t) => result.push(t));
  getBudgetTypeExtraTotals(
    month,
    accounts,
    [...calculatedPairTotals, ...result],
    BudgetTypeExtra.monthDelta,
    getMonthDeltaPair
  ).forEach((t) => result.push(t));

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

  if (leftFromPrevMonthTotal === undefined || incomeTotal === undefined) {
    return;
  }

  const planned = leftFromPrevMonthTotal.planned + incomeTotal.planned;
  const actual = leftFromPrevMonthTotal.actual + incomeTotal.actual;
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
  const transferToAccountTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.transferToAccount
  );

  if (
    openingBalanceTotal === undefined ||
    spendingTotal === undefined ||
    transferToAccountTotal === undefined
  ) {
    return;
  }

  const planned =
    openingBalanceTotal.planned -
    spendingTotal.planned -
    transferToAccountTotal.planned;
  const actual =
    openingBalanceTotal.actual -
    spendingTotal.actual -
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
  const openingBalanceTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.income
  );
  const spendingTotal = calculatedPairAccountTotals.find(
    (cp) => cp.budgetType === BudgetTypeUser.spending
  );

  if (openingBalanceTotal === undefined || spendingTotal === undefined) {
    return;
  }

  const planned = openingBalanceTotal.planned - spendingTotal.planned;
  const actual = openingBalanceTotal.actual - spendingTotal.actual;
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
