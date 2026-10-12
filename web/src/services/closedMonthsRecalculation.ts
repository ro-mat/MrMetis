import moment, { Moment, MomentInput } from "moment";
import { buildBudgetPairsForMonth } from "./budgetBuilder";
import { BudgetPair } from "./budgetPair";
import {
  ClosingData,
  getLeftForNextMonth,
  isMonthClosed,
  storeLeftForNextMonth,
} from "./budgetClosing";

// Stores again what is left after every closed month from `from` on, as
// closing them did, e.g. after statements were added to them. Months are
// built one after the other, so each closed month passes its new left on.
// Throws like buildBudgetPairsForMonth (e.g. a broken formula), changing
// nothing.
export const recalculateClosedMonths = (
  data: ClosingData,
  from: MomentInput
) => {
  const start = moment(from).startOf("M");
  const last = data.closedMonths
    .map((m) => moment(m))
    .filter((m) => !m.isBefore(start, "M"))
    .sort((a, b) => a.diff(b))
    .pop();
  if (!last) return;

  // stored in copies until every month is done
  const accounts = data.accounts.map((a) => ({
    ...a,
    leftFromPrevMonth: [...a.leftFromPrevMonth],
  }));
  const work = { ...data, accounts };
  const build = (month: Moment, prev: BudgetPair[]) =>
    buildBudgetPairsForMonth(
      month,
      data.budgets,
      data.statements,
      accounts,
      prev,
      data.closedMonths
    );

  let prev = build(start.clone().add(-1, "M"), []);
  for (
    const month = start.clone();
    !month.isAfter(last, "M");
    month.add(1, "M")
  ) {
    const pairs = build(month.clone(), prev.list);
    if (isMonthClosed(data.closedMonths, month)) {
      storeLeftForNextMonth(
        work,
        month,
        getLeftForNextMonth(pairs, accounts, month)
      );
    }
    prev = pairs;
  }

  data.accounts.forEach(
    (a, i) => (a.leftFromPrevMonth = accounts[i].leftFromPrevMonth)
  );
};
