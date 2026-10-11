import { Moment } from "moment";
import { BudgetType } from "store/userdata/userdata.types";
import { roundTo } from "helpers/numberHelper";

export type BudgetStatement = {
  id: number;
  accountId: number;
  date: string;
  amount: number;
  comment?: string;
};

// Planned and actual amount of one budget (or a total, budgetId 0) for one
// account and month. accountId 0 on a total means "all accounts".
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
        this.children.some((c) => c.isActive(accountId)))
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

  // all descendants (depth first) that belong to the account
  private descendantsOf(accountId?: number): BudgetPair[] {
    return this.children.flatMap((c) => [
      ...(c.matchesAccount(accountId) ? [c] : []),
      ...c.descendantsOf(accountId),
    ]);
  }

  getChildrenPlanned(accountId?: number): number {
    const planned = this.descendantsOf(accountId).reduce(
      (prev, cur) => prev + cur.planned,
      0
    );
    return roundTo(planned, 2);
  }

  getChildrenActual(accountId?: number): number {
    const actual = this.descendantsOf(accountId).reduce(
      (prev, cur) => prev + cur.actual,
      0
    );
    return roundTo(actual, 2);
  }

  getChildrenStatements(accountId?: number): BudgetStatement[] {
    return this.descendantsOf(accountId).flatMap((c) => c.statements);
  }

  hasOwnValues(): boolean {
    return roundTo(this.planned, 2) !== 0 || roundTo(this.actual, 2) !== 0;
  }

  // checks each descendant separately, so opposite values can't cancel out
  hasChildrenValues(accountId?: number): boolean {
    return this.descendantsOf(accountId).some((c) => c.hasOwnValues());
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
