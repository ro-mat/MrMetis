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
  calculate,
  calculateForNextMonth,
  getExtraTotals,
  getRelevantFormulas,
  getUserTotals,
  roundTo,
} from "./budgetCalculator";
import { flattenBudgetPairs } from "helpers/budgetMapper";

export type BudgetStatement = {
  id: number;
  accountId: number;
  date: string;
  amount: number;
  comment?: string;
};

export class BudgetPairArray {
  list: BudgetPair[] = [];
  flatList: BudgetPair[] = [];
  // flatList grouped by budget id, for fast per-budget lookups while rendering
  private byBudgetId = new Map<number, BudgetPair[]>();

  constructor(list?: BudgetPair[]) {
    if (!list) return;
    this.list = list;
    this.flatList = flattenBudgetPairs(list);
    for (const pair of this.flatList) {
      const pairs = this.byBudgetId.get(pair.budgetId);
      if (pairs) {
        pairs.push(pair);
      } else {
        this.byBudgetId.set(pair.budgetId, [pair]);
      }
    }
  }

  private pairsOf(budgetId: number) {
    return this.byBudgetId.get(budgetId) ?? [];
  }

  tryAddBudgetPair(budgetPair: BudgetPair) {
    if (!budgetPair.parentId) {
      this.list.push(budgetPair);
      return true;
    }
    for (let item of this.list) {
      if (item.tryAddChild(budgetPair, budgetPair.parentId)) {
        return true;
      }
    }
    return false;
  }

  isBudgetActive(budgetId: number, accountId?: number) {
    return this.pairsOf(budgetId).some(
      (item) =>
        item.isActive(accountId) ||
        item.children.some((c) => c.isActive(accountId))
    );
  }

  isBudgetRemaining(budgetId: number, accountId?: number) {
    return this.pairsOf(budgetId).some((item) => item.isRemaining(accountId));
  }

  getActiveMonths() {
    return this.list
      .reduce((prev: Moment[], cur) => {
        if (!prev.find((p) => p.isSame(cur.month, "M"))) {
          prev.push(cur.month);
        }
        return prev;
      }, [])
      .sort((a, b) => a.diff(b));
  }

  getBudgetPair(
    budgetId: number,
    month: Moment,
    accountId?: number
  ): BudgetPair | undefined {
    const monthPairs = this.pairsOf(budgetId).filter((i) =>
      i.month.isSame(month, "M")
    );

    if (monthPairs.length === 0) {
      return undefined;
    }

    // may be empty when the budget itself is planned on another account only,
    // its children can still belong to this account
    const budgetPairs = monthPairs.filter(
      (i) =>
        accountId === undefined ||
        i.accountId === accountId ||
        i.accountId === 0
    );

    const init = new BudgetPair(
      budgetId,
      accountId ?? 0,
      month,
      monthPairs[0].budgetType,
      0,
      0,
      monthPairs[0].expectOneStatement,
      []
    );
    // a child is attached to the first parent pair found, which may belong to
    // another account, so collect children from every parent pair of the month
    init.children = monthPairs.flatMap((i) => i.children);

    for (const cur of budgetPairs) {
      init.planned += cur.planned;
      init.actual += cur.actual;
      init.statements.push(...cur.statements);
    }

    return init;
  }

  getTotalPair(budgetTypes: BudgetType[], month: Moment, accountId?: number) {
    const resultPair = new BudgetPair(
      0,
      accountId ?? 0,
      month,
      budgetTypes[0],
      0,
      0,
      true,
      []
    );
    budgetTypes.forEach((bt) => {
      const item = this.list.find(
        (i) =>
          i.budgetId === 0 &&
          i.budgetType === bt &&
          i.month.isSame(month, "M") &&
          (accountId === undefined
            ? i.accountId === 0
            : i.accountId === accountId)
      );
      resultPair.planned += item?.planned ?? 0;
      resultPair.actual += item?.actual ?? 0;
    });
    return resultPair;
  }
}

export class BudgetPair {
  budgetId: number;
  parentId?: number;
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
    statements: BudgetStatement[],
    parentId?: number
  ) {
    this.budgetId = budgetId;
    this.accountId = accountId;
    this.month = month;
    this.budgetType = budgetType;
    this.planned = planned;
    this.actual = actual;
    this.expectOneStatement = expectOneStatement;
    this.statements = statements;
    this.parentId = parentId;
  }

  // A calculated total (not tied to a budget), rounded to cents.
  static total(
    accountId: number,
    month: Moment,
    budgetType: BudgetType,
    planned: number,
    actual: number
  ) {
    return new BudgetPair(
      0,
      accountId,
      month,
      budgetType,
      roundTo(planned, 2),
      roundTo(actual, 2),
      true,
      []
    );
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

  private matchesAccount(accountId?: number) {
    return !accountId || this.accountId === accountId || this.accountId === 0;
  }

  getChildrenPlanned(accountId?: number): number {
    const planned = this.children.reduce(
      (prev, cur) =>
        prev +
        (cur.matchesAccount(accountId) ? cur.planned : 0) +
        cur.getChildrenPlanned(accountId),
      0
    );
    return roundTo(planned, 2);
  }

  getChildrenActual(accountId?: number): number {
    const actual = this.children.reduce(
      (prev, cur) =>
        prev +
        (cur.matchesAccount(accountId) ? cur.actual : 0) +
        cur.getChildrenActual(accountId),
      0
    );
    return roundTo(actual, 2);
  }

  getChildrenStatements(accountId?: number): BudgetStatement[] {
    return this.children.flatMap((cur) => [
      ...(cur.matchesAccount(accountId) ? cur.statements : []),
      ...cur.getChildrenStatements(accountId),
    ]);
  }

  hasOwnValues(): boolean {
    return roundTo(this.planned, 2) !== 0 || roundTo(this.actual, 2) !== 0;
  }

  // checks each descendant separately, so opposite values can't cancel out
  hasChildrenValues(accountId?: number): boolean {
    return this.children.some(
      (c) =>
        (c.matchesAccount(accountId) && c.hasOwnValues()) ||
        c.hasChildrenValues(accountId)
    );
  }

  isRemaining(accountId?: number): boolean {
    return (
      (accountId === undefined || this.accountId === accountId) &&
      ((this.planned > 0 &&
        ((this.expectOneStatement && this.actual === 0) ||
          (!this.expectOneStatement && this.actual < this.planned))) ||
        this.children.some((c) => c.isRemaining()))
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
  const flatPrevMonthBudgetPairs = flattenBudgetPairs(prevMonthBudgetPairs);
  const monthStatements = statements.filter((s) =>
    moment(s.date).isSame(month, "M")
  );
  const prevMonthCalculate = new Calculate(
    month.clone().add(-1, "M"),
    new BudgetCalculatedList(flatPrevMonthBudgetPairs)
  );

  const relevantFormulas = budgets
    .flatMap((b) => getRelevantFormulas(month.toDate(), b))
    .sort((a, b) => (a.parentId ?? 0) - (b.parentId ?? 0)); // calculate all root parents first

  const budgetPairs: BudgetPair[] = [];

  // add left from prev month
  let totalPlanned = 0;
  let totalActual = 0;
  for (let account of accounts) {
    const planned = calculateForNextMonth(flatPrevMonthBudgetPairs, account.id);
    const actual = (account.leftFromPrevMonth.find((pm) =>
      moment(pm.month).isSame(month, "M")
    )?.amount ?? 0) as number;
    const pair = new BudgetPair(
      0,
      account.id,
      month,
      BudgetTypeExtra.leftFromPrevMonth,
      planned,
      actual,
      true,
      []
    );

    budgetPairs.push(pair);
    totalPlanned += planned;
    totalActual += actual;
  }

  const pair = new BudgetPair(
    0,
    0,
    month,
    BudgetTypeExtra.leftFromPrevMonth,
    totalPlanned,
    totalActual,
    true,
    []
  );
  budgetPairs.push(pair);

  let curMonthCalculate = new Calculate(
    month,
    new BudgetCalculatedList(budgetPairs)
  );

  let lastLenght = relevantFormulas.length + 1; // +1 for initial run

  while (relevantFormulas.length > 0) {
    if (relevantFormulas.length === lastLenght) {
      const problemFormulas = relevantFormulas
        .map((f) => `{budget id: ${f.budgetId}, formula: ${f.formula}}`)
        .join(", ");
      throw Error(
        `Infinite loop detected while calculating! Problem somewhere here: [${problemFormulas}]`
      );
    }
    lastLenght = relevantFormulas.length;

    for (let i = 0; i < lastLenght; i++) {
      const f = relevantFormulas.shift()!;

      const rawAmount = calculate(
        f.formula,
        curMonthCalculate,
        prevMonthCalculate
      );
      if (typeof rawAmount !== "number" || isNaN(rawAmount)) {
        // depends on something not calculated yet (or is broken), retry next pass
        relevantFormulas.push(f);
        continue;
      }

      const planned = rawAmount;

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
        budgetAccountStatements,
        f.parentId
      );
      budgetPairs.push(pair);

      if (f.budgetType === BudgetTypeUser.transferToAccount) {
        // duplicate the pair for receiving account
        const duplicatePair = new BudgetPair(
          pair.budgetId,
          f.toAccountId!,
          pair.month,
          BudgetTypeExtra.transferFromAccount,
          pair.planned,
          pair.actual,
          pair.expectOneStatement,
          pair.statements
        );
        budgetPairs.push(duplicatePair);
      }
    }

    budgetPairs.push(
      ...getUserTotals(month, accounts, budgetPairs, relevantFormulas)
    );
    budgetPairs.push(...getExtraTotals(month, accounts, budgetPairs));

    curMonthCalculate = new Calculate(
      month,
      new BudgetCalculatedList(budgetPairs)
    );
  }

  const tree = new BudgetPairArray();
  budgetPairs.forEach((bp) => tree.tryAddBudgetPair(bp));

  // rebuild so the flat list and lookup index cover the finished tree
  return new BudgetPairArray(tree.list);
};
