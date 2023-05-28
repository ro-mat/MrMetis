import { BudgetItems, IBudgetPair } from "./BudgetItems";

export class BudgetMonthAccount extends BudgetItems {
  accountId: number;
  leftFromPrevMonth!: IBudgetPair;

  constructor(
    accountId: number,
    month: Date,
    fromPrevMonth: number,
    prevItems?: BudgetItems
  ) {
    super(month);

    this.accountId = accountId;
    this.leftFromPrevMonth = {
      planned: prevItems?.forNextMonth ?? 0,
      actual: fromPrevMonth,
    };
  }
}
