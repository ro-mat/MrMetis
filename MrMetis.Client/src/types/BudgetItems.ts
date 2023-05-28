import { Calculate } from "helpers/budgetHelper";
import moment from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IBudget,
  IStatement,
} from "store/userdata/userdata.types";
import { IBudgetResolver } from "./BudgetMonth";
import { roundTo } from "helpers/evalHelper";

export class BudgetItems {
  month: Date;
  list: IBudgetItem[];

  leftFromPrevMonth!: IBudgetPair;

  totalIncome!: IBudgetPair;
  totalSpending!: IBudgetPair;
  totalLoanReturn!: IBudgetPair;
  totalSavings!: IBudgetPair;
  totalToOtherAccount!: IBudgetPair;
  totalFromOtherAccount!: IBudgetPair;
  totalKeepOnAccount!: IBudgetPair;

  openingBalance!: IBudgetPair;
  totalSpendings!: IBudgetPair;
  closingBalance!: IBudgetPair;

  monthDelta!: IBudgetPair;

  forNextMonth!: number;

  constructor(month: Date, list?: IBudgetItem[]) {
    this.month = month;
    this.list = list ? [...list] : [];
  }

  addItem = (
    b: IBudgetResolver,
    plannedAmount: number,
    statements: IStatement[],
    actualAmount?: number,
    parentId?: number
  ): IBudgetItem | undefined => {
    if (b.parentId && b.parentId !== parentId) {
      const parent = this.list.find((item) => item.id === b.parentId);
      if (parent) {
        return parent.children.addItem(
          b,
          plannedAmount,
          statements,
          actualAmount,
          b.parentId
        );
      }
      const itemsWithChildren = this.list.filter(
        (item) => item.children.list.length > 0
      );
      for (const item of itemsWithChildren) {
        const newItem = item.children.addItem(
          b,
          plannedAmount,
          statements,
          actualAmount,
          item.id
        );
        if (newItem) {
          return newItem;
        }
      }
      // failed to add
      return;
    }

    const st = actualAmount
      ? statements
      : statements.filter((s) => s.budgetId === b.budgetId);
    const budgetItem = {
      id: b.budgetId,
      name: b.budgetName,
      type: b.type,
      budget: b.originalBudget,
      statements: st,
      planned: plannedAmount,
      actual: actualAmount ?? st.reduce((prev, cur) => prev + cur.amount, 0),
      children: new BudgetItems(this.month),
    };
    this.list.push(budgetItem);

    return budgetItem;
  };

  filterByTypes = (types: BudgetType[]) => {
    const filtered = new BudgetItems(
      this.month,
      this.list.filter((item) => types.includes(item.type))
    );
    return filtered;
  };

  getItem = (id: number): IBudgetItem | undefined => {
    for (const budgetItem of this.list) {
      if (budgetItem.id === id) {
        return budgetItem;
      }

      const child = budgetItem.children.getItem(id);
      if (child) {
        return child;
      }
    }
  };

  getTotalPlanned = (): number =>
    this.list.reduce(
      (prev, cur) => prev + cur.planned + cur.children.getTotalPlanned(),
      0
    );

  getTotalActual = (): number =>
    this.list.reduce(
      (prev, cur) => prev + cur.actual + cur.children.getTotalActual(),
      0
    );

  trySetTotal = (type?: BudgetType, trySetCompoundTotals = true) => {
    const filtered = type
      ? this.filterByTypes([type])
      : new BudgetItems(this.month);

    switch (type) {
      case BudgetTypeUser.income:
        this.totalIncome = {
          planned: filtered.getTotalPlanned(),
          actual: filtered.getTotalActual(),
        };
        break;
      case BudgetTypeUser.spending:
        this.totalSpending = {
          planned: filtered.getTotalPlanned(),
          actual: filtered.getTotalActual(),
        };
        break;
      case BudgetTypeUser.loanReturn:
        this.totalLoanReturn = {
          planned: filtered.getTotalPlanned(),
          actual: filtered.getTotalActual(),
        };
        break;
      case BudgetTypeUser.savings:
        this.totalSavings = {
          planned: filtered.getTotalPlanned(),
          actual: filtered.getTotalActual(),
        };
        break;
      case BudgetTypeUser.transferToAccount:
        this.totalToOtherAccount = {
          planned: filtered.getTotalPlanned(),
          actual: filtered.getTotalActual(),
        };
        break;
      case BudgetTypeExtra.transferFromAccount:
        this.totalFromOtherAccount = {
          planned: filtered.getTotalPlanned(),
          actual: filtered.getTotalActual(),
        };
        break;
      case BudgetTypeUser.keepOnAccount:
        this.totalKeepOnAccount = {
          planned: filtered.getTotalPlanned(),
          actual: filtered.getTotalActual(),
        };
        break;
      default:
        // try set all
        this.trySetTotal(BudgetTypeUser.income, false);
        this.trySetTotal(BudgetTypeUser.spending, false);
        this.trySetTotal(BudgetTypeUser.loanReturn, false);
        this.trySetTotal(BudgetTypeUser.savings, false);
        this.trySetTotal(BudgetTypeUser.transferToAccount, false);
        this.trySetTotal(BudgetTypeExtra.transferFromAccount, false);
        this.trySetTotal(BudgetTypeUser.keepOnAccount, false);
        break;
    }

    if (trySetCompoundTotals) {
      this.trySetCompundTotals();
    }
  };

  trySetCompundTotals = () => {
    if (
      this.openingBalance === undefined &&
      this.totalIncome !== undefined &&
      this.totalFromOtherAccount !== undefined
    ) {
      this.openingBalance = {
        planned:
          this.leftFromPrevMonth.planned +
          this.totalIncome.planned +
          this.totalFromOtherAccount.planned,
        actual:
          this.leftFromPrevMonth.actual +
          this.totalIncome.actual +
          this.totalFromOtherAccount.actual,
      };
    }

    if (
      this.totalSpendings === undefined &&
      this.totalSpending !== undefined &&
      this.totalLoanReturn !== undefined &&
      this.totalSavings !== undefined
    ) {
      this.totalSpendings = {
        planned:
          this.totalSpending.planned +
          this.totalLoanReturn.planned +
          this.totalSavings.planned,
        actual:
          this.totalSpending.actual +
          this.totalLoanReturn.actual +
          this.totalSavings.actual,
      };
    }

    if (
      this.closingBalance === undefined &&
      this.openingBalance !== undefined &&
      this.totalSpendings !== undefined &&
      this.totalToOtherAccount !== undefined
    ) {
      this.closingBalance = {
        planned:
          this.openingBalance.planned -
          this.totalSpendings.planned -
          this.totalToOtherAccount.planned,
        actual:
          this.openingBalance.actual -
          this.totalSpendings.actual -
          this.totalToOtherAccount.actual,
      };
    }

    if (
      this.monthDelta === undefined &&
      this.totalIncome !== undefined &&
      this.totalSpendings !== undefined
    ) {
      this.monthDelta = {
        planned: this.totalIncome.planned - this.totalSpendings.planned,
        actual: this.totalIncome.actual - this.totalSpendings.actual,
      };
    }

    if (
      this.forNextMonth === undefined &&
      this.totalIncome !== undefined &&
      this.totalSpending !== undefined &&
      this.totalLoanReturn !== undefined &&
      this.totalSavings !== undefined &&
      this.totalToOtherAccount !== undefined &&
      this.totalFromOtherAccount !== undefined &&
      this.totalKeepOnAccount !== undefined
    ) {
      this.forNextMonth = roundTo(this.calculateForNextMonth(), 2);
    }
  };

  calculateForNextMonth = () => {
    const res =
      this.getEstimation(this.leftFromPrevMonth, true) +
      this.list.reduce((prev, cur) => {
        const estimation = this.getEstimation(
          cur,
          cur.budget.expectOneStatement
        );
        const childrenEstimation = cur.children.list.reduce(
          (childPrev, childCur) =>
            childPrev +
            this.getEstimation(childCur, childCur.budget.expectOneStatement),
          0
        );
        switch (cur.type) {
          case BudgetTypeExtra.transferFromAccount:
          case BudgetTypeUser.income: {
            return prev + estimation + childrenEstimation;
          }
          case BudgetTypeUser.transferToAccount:
          case BudgetTypeUser.loanReturn:
          case BudgetTypeUser.savings:
          case BudgetTypeUser.spending: {
            return prev - estimation - childrenEstimation;
          }
          default: {
            return prev;
          }
        }
      }, 0);
    return res;
  };

  getEstimation = (pair: IBudgetPair, expectOneStatement: boolean) => {
    return moment(this.month).isBefore(moment(), "M") ||
      (pair.actual > 0 && pair.actual > pair.planned) ||
      (expectOneStatement && pair.actual > 0)
      ? pair.actual
      : pair.planned;
  };

  getCalc = () => {
    return new Calculate(this);
  };
}

export interface IBudgetItem extends IBudgetPair {
  id: number;
  name: string;
  type: BudgetType;
  budget: IBudget;
  statements: IStatement[];

  children: BudgetItems;
}

export interface IBudgetPair {
  planned: number;
  actual: number;
}
