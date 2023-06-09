import moment, { Moment } from "moment";
import { IAccount, IBudget, IStatement } from "store/userdata/userdata.types";
import { calculate } from "./evalHelper";
import { BudgetItems } from "types/BudgetItems";
import { BudgetMonth } from "types/BudgetMonth";

export const getBudgetAmount = (month: Date, budget: IBudget) => {
  return calculate(
    getRelevantAmount(month, budget),
    new Calculate(),
    new Calculate()
  );
};

export const getRelevantAmount = (month: Date, budget: IBudget) => {
  return (
    budget.overrides?.find((o) => moment(o.month).isSame(month, "M"))?.amount ??
    budget.amounts?.find((a) => {
      const isWithinTimeframe = a.endDate
        ? moment(month)
            .startOf("M")
            .isBetween(
              moment(a.startDate).startOf("M"),
              moment(a.endDate).endOf("M"),
              "M",
              "[]"
            )
        : moment(month)
            .startOf("M")
            .isSameOrAfter(moment(a.startDate).startOf("M"), "M");
      const diff = moment(month)
        .startOf("M")
        .diff(moment(a.startDate).startOf("M"), "M");
      return isWithinTimeframe && diff % a.frequency === 0;
    })?.amount ??
    "0"
  );
};

export class Calculate {
  month: Moment;
  items: Map<number, number>;

  leftFromPrevMonth?: number;

  totalIncome?: number;
  totalSpending?: number;
  totalLoanReturn?: number;
  totalSavings?: number;
  totalToOtherAccount?: number;
  totalFromOtherAccount?: number;
  totalKeepOnAccount?: number;

  openingBalance?: number;
  totalSpendings?: number;
  closingBalance?: number;

  accounts?: Map<number, Calculate>;

  constructor(budgetItems?: BudgetItems) {
    this.month = moment(budgetItems?.month);
    this.items = new Map(
      budgetItems?.list.map((item) => {
        return [item.id, item.planned];
      }) ?? []
    );

    if (budgetItems instanceof BudgetMonth) {
      this.accounts = new Map(
        [...budgetItems.budgetMonthAccounts.values()].map((a) => {
          return [a.accountId, a.getCalc()];
        })
      );
    }

    this.leftFromPrevMonth = budgetItems?.leftFromPrevMonth.planned;

    this.totalIncome = budgetItems?.totalIncome?.planned;
    this.totalSpending = budgetItems?.totalSpending?.planned;
    this.totalLoanReturn = budgetItems?.totalLoanReturn?.planned;
    this.totalSavings = budgetItems?.totalSavings?.planned;
    this.totalToOtherAccount = budgetItems?.totalToOtherAccount?.planned;
    this.totalFromOtherAccount = budgetItems?.totalFromOtherAccount?.planned;
    this.totalKeepOnAccount = budgetItems?.totalKeepOnAccount?.planned;

    this.openingBalance = budgetItems?.openingBalance?.planned;
    this.totalSpendings = budgetItems?.totalSpendings?.planned;
    this.closingBalance = budgetItems?.closingBalance?.planned;
  }

  getDaysInMonth = () => this.month.daysInMonth();

  getWeekdaysInMonth = (day: number) => {
    if (day < 1 || day > 7) {
      throw Error("Day can only be from 1 to 7!");
    }

    const curMonth = this.month.clone().set("D", 1);
    let res = 0;

    while (curMonth.isSame(this.month, "M")) {
      if (curMonth.day() === day) {
        res++;
      }

      curMonth.add(1, "d");
    }
    return res;
  };

  getItem = (id: number) => {
    return this.items.get(id);
  };

  account = (id: number) => {
    return this.accounts?.get(id);
  };
}

export const getBudgetAggregate = (
  month: Date,
  budgets: IBudget[],
  statements: IStatement[],
  accounts: IAccount[],
  startingMonth: Date
): BudgetMonth | undefined => {
  const prevMonth = moment(startingMonth).isBefore(month, "M")
    ? getBudgetAggregate(
        moment(month).add(-1, "M").toDate(),
        budgets,
        statements,
        accounts,
        startingMonth
      )
    : undefined;

  return new BudgetMonth(month, budgets, statements, accounts, prevMonth);
};
