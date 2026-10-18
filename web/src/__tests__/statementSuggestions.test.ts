import moment from "moment";
import i18n from "locales/i18n";
import {
  getBudgetSuggestions,
  getDateSuggestions,
  IBudgetInfo,
  splitQuickAddText,
} from "helpers/statementSuggestionHelper";
import { createFormatter, defaultPreferences } from "helpers/localeHelper";
import { plannedAccounts } from "services/budgetClosing";
import { DATE_FORMAT } from "helpers/dateHelper";
import { BudgetTypeUser, IBudget } from "store/userdata/userdata.types";

const MAIN = 1;
const CARD = 2;
const month = moment("2026-06-01");
const day = (d: number) => month.clone().date(d).format(DATE_FORMAT);

const budget = (
  id: number,
  plans: [accountId: number, amount: number][] = [],
  extra: Partial<IBudget> = {}
): IBudget => ({
  id,
  name: `budget ${id}`,
  toAccountId: 0,
  isEssential: false,
  amounts: plans.map(([fromAccountId, amount]) => ({
    expression: [{ kind: "number", value: amount }],
    fromAccountId,
    frequency: 1,
    startDate: day(1),
  })),
  overrides: [],
  type: BudgetTypeUser.spending,
  closeAfterOneStatement: false,
  dateCreated: day(1),
  ...extra,
});

const info = (
  left: number,
  isClosed = false,
  accountIds: number[] = [MAIN]
): IBudgetInfo => ({ left, isClosed, accountIds });

const suggestions = (budgets: IBudget[], infos: [number, IBudgetInfo][]) =>
  getBudgetSuggestions(
    budgets,
    new Map(infos),
    () => undefined,
    i18n.t,
    (value) => value.toFixed(2)
  );

describe("getBudgetSuggestions", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  it("ranks open budgets by what is left, then the rest, then closed", () => {
    const list = suggestions(
      [1, 2, 3, 4, 5].map((id) => budget(id)),
      [
        [1, info(50, true)],
        [2, info(0)],
        [3, info(20)],
        [4, info(80)],
        // 5 has no info, e.g. the calculation failed
      ]
    );

    expect(list.map((s) => s.obj.budgetId)).toEqual([4, 3, 2, 5, 1]);
  });

  it("fills the account only when the budget is planned on one", () => {
    const list = suggestions(
      [budget(1), budget(2), budget(3)],
      [
        [1, info(10, false, [CARD])],
        [2, info(10, false, [MAIN, CARD])],
        [3, info(10, false, [])],
      ]
    );

    expect(list.map((s) => s.obj)).toEqual([
      { budgetId: 1, accountId: CARD },
      { budgetId: 2 },
      { budgetId: 3 },
    ]);
  });

  it("offers what is left as the amount of an open one-time bill", () => {
    const oneTime = { closeAfterOneStatement: true };
    const list = suggestions(
      [budget(1, [], oneTime), budget(2, [], oneTime), budget(3)],
      [
        [1, info(40)],
        [2, info(30, true)],
        [3, info(20)],
      ]
    );

    expect(list.map((s) => s.obj.defaultAmount)).toEqual([
      40,
      undefined,
      undefined,
    ]);
  });

  it("shows what is left, or that the budget is closed", () => {
    const [open, done, closed] = suggestions(
      [budget(1), budget(2), budget(3)],
      [
        [1, info(12.5)],
        [2, info(0)],
        [3, info(5, true)],
      ]
    );

    expect(open.text).toMatch(/budget 1 · 12\.50 left$/);
    expect(done.text).toMatch(/budget 2$/);
    expect(closed.text).toMatch(/budget 3 · closed$/);
  });
});

describe("plannedAccounts", () => {
  it("lists each planned account once and skips account 0", () => {
    const b = budget(1, [
      [MAIN, 10],
      [CARD, 5],
      [MAIN, 3],
      [0, 7],
    ]);

    expect(plannedAccounts(b, month)).toEqual([MAIN, CARD]);
  });

  it("uses the budget's account when nothing is planned", () => {
    expect(plannedAccounts(budget(1, [], { fromAccountId: CARD }), month)).toEqual(
      [CARD]
    );
    expect(plannedAccounts(budget(1), month)).toEqual([]);
  });
});

describe("splitQuickAddText", () => {
  const { parseAmount, parseDate, formatDate } = createFormatter({
    ...defaultPreferences(),
    locale: { country: "US" },
  });
  const split = (text: string) =>
    splitQuickAddText(
      text,
      getDateSuggestions(i18n.t, formatDate),
      parseAmount,
      parseDate
    );

  beforeAll(() => i18n.changeLanguage("en"));

  it("takes the amount and a date word out of the text", () => {
    const parts = split("coffee 4.5 yesterday");

    expect(parts?.rest).toBe("coffee");
    expect(parts?.amount).toBe(4.5);
    expect(moment(parts?.date).isSame(moment().add(-1, "d"), "d")).toBe(true);
  });

  it("takes a typed date and keeps the words in order", () => {
    const parts = split("car insurance 06/15/2026 120");

    expect(parts?.rest).toBe("car insurance");
    expect(parts?.amount).toBe(120);
    expect(moment(parts?.date).format(DATE_FORMAT)).toBe("2026-06-15");
  });

  it("keeps a second amount among the words", () => {
    expect(split("2 coffees 7")?.rest).toBe("coffees 7");
  });

  it("leaves single words, whole amounts and plain names alone", () => {
    expect(split("coffee")).toBeUndefined();
    expect(split("1 000")).toBeUndefined();
    expect(split("car insurance")).toBeUndefined();
  });
});
