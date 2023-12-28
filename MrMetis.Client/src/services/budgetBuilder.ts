import moment from "moment";
import { BudgetType } from "store/userdata/userdata.types";

export type BudgetStatement = {
  accountId: number;
  date: string;
  amount: number;
  commnet: string;
};

export class BudgetPairArray {
  list: BudgetPair[] = [];

  addBudgetPair(budgetPair: BudgetPair, parentBudgetId?: number) {
    if (!parentBudgetId) {
      this.list.push(budgetPair);
    }
    for (let item of this.list) {
      if (item.tryAddChild(budgetPair)) {
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
  month: string;
  budgetType: BudgetType;
  planned: number;
  actual: number;
  expectOneStatement: boolean;
  statements: BudgetStatement[];
  children: BudgetPair[] = [];

  constructor(
    budgetId: number,
    accountId: number,
    month: string,
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

  tryAddChild(budgetPair: BudgetPair) {
    if (budgetPair.budgetId === this.budgetId) {
      this.children.push(budgetPair);
      return true;
    }
    for (let childPair of this.children) {
      if (childPair.tryAddChild(budgetPair)) {
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

export type BudgetPairPerAccount = BudgetPair & {
  accountId: number;
};
