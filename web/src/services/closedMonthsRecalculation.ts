import moment, { MomentInput } from "moment";
import { IAccount } from "store/userdata/userdata.types";
import { buildBudgetPairsForMonths } from "./budgetBuilder";
import {
  ClosingData,
  getLeftForNextMonth,
  isMonthClosed,
  storeLeftForNextMonth,
} from "./budgetClosing";

// What is left after every closed month from `from` on, stored again as
// closing them did (e.g. after statements were added to them): each account
// with its new left from prev month, nothing when no month that late is
// closed. Months are built one after the other, so each closed month passes
// its new left on. Throws like buildBudgetPairsForMonth (e.g. a broken
// formula).
export const recalculateClosedMonths = (
  data: ClosingData,
  from: MomentInput
): Pick<IAccount, "id" | "leftFromPrevMonth">[] | undefined => {
  const start = moment(from).startOf("M");
  const last = data.closedMonths
    .map((m) => moment(m))
    .filter((m) => !m.isBefore(start, "M"))
    .sort((a, b) => a.diff(b))
    .pop();
  if (!last) return;

  // copies, read by the months after the one they are stored for
  const accounts = data.accounts.map((a) => ({
    ...a,
    leftFromPrevMonth: [...a.leftFromPrevMonth],
  }));
  const work = { ...data, accounts };
  buildBudgetPairsForMonths(start, last, work, (month, pairs) => {
    if (isMonthClosed(data.closedMonths, month)) {
      storeLeftForNextMonth(
        work,
        month,
        getLeftForNextMonth(pairs, accounts, month)
      );
    }
  });
  return accounts.map(({ id, leftFromPrevMonth }) => ({
    id,
    leftFromPrevMonth,
  }));
};
