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

  addBudgetPair(budgetPair: BudgetPair, parentBudgetId?: number) {
    if (!parentBudgetId) {
      this.list.push(budgetPair);
      return;
    }
    for (let item of this.list) {
      if (item.tryAddChild(budgetPair, parentBudgetId)) {
        return;
      }
    }
  }

  isBudgetActive(budgetId: number, accountId?: number) {
    for (let item of this.list.filter((l) => l.budgetId === budgetId)) {
      if (item.isActive(accountId)) {
        return true;
      }
    }
    return false;
  }

  getBudgetPair(budgetId: number, month?: string, accountId?: number) {
    return this.list.find(
      (l) =>
        l.budgetId === budgetId &&
        (month === undefined || moment(l.month).isSame(month, "M")) &&
        (accountId === undefined || l.accountId === accountId)
    );
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
    return this.children.reduce(
      (prev, cur) => prev + cur.planned + cur.getChildrenPlanned(),
      0
    );
  }

  getChildrenActual(): number {
    return this.children.reduce(
      (prev, cur) => prev + cur.actual + cur.getChildrenActual(),
      0
    );
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

  const relevantFormulas = budgets.reduce((prev: RelevantFormula[], cur) => {
    const formulas = getRelevantFormulas(month.toDate(), cur);
    return [...prev, ...formulas];
  }, []);

  const result = new BudgetPairArray();

  let lastLenght = relevantFormulas.length + 1; // +1 for initial run

  while (relevantFormulas.length < lastLenght) {
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
        actual,
        f.expectOneStatement,
        budgetAccountStatements
      );
      result.addBudgetPair(pair, f.parentId);
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
    result.addBudgetPair(pair);
  }

  return result;
};
