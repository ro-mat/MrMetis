import moment, { Moment } from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
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

  let lastLenght = relevantFormulas.length + 1; // +1 for initial run

  while (relevantFormulas.length > 0) {
    if (relevantFormulas.length === lastLenght) {
      throw Error("Circular reference detected!");
    }
    lastLenght = relevantFormulas.length;

    for (let i = 0; i < lastLenght; i++) {
      const f = relevantFormulas.shift();
      if (!f) {
        throw Error("something went wrong");
      }

      const rawAmount = calculate(
        f.formula,
        new Calculate(
          month,
          new BudgetCalculatedList(mapToBudgetCalculated(result.list))
        ),
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
      if (!result.tryAddBudgetPair(pair, f.parentId)) {
        relevantFormulas.push(f);
      }
    }
  }

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

  return result;
};
