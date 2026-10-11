import { Moment } from "moment";
import { BudgetType } from "store/userdata/userdata.types";
import { flattenBudgetPairs } from "helpers/budgetMapper";
import { BudgetPair } from "./budgetPair";

// Tree of calculated budget pairs with the lookups the UI renders from.
export class BudgetPairArray {
  list: BudgetPair[] = [];
  // every pair of the tree grouped by budget id, for fast per-budget lookups
  private byBudgetId = new Map<number, BudgetPair[]>();

  constructor(list?: BudgetPair[]) {
    if (!list) return;
    this.list = list;
    for (const pair of flattenBudgetPairs(list)) {
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
    for (const item of this.list) {
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
    const seen = new Set<string>();
    return this.list
      .map((i) => i.month)
      .filter((month) => {
        const key = month.format("YYYY-MM");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
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
          i.accountId === (accountId ?? 0)
      );
      resultPair.planned += item?.planned ?? 0;
      resultPair.actual += item?.actual ?? 0;
    });
    return resultPair;
  }
}
