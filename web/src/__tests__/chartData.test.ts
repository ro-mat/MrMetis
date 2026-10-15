import moment from "moment";
import { buildBudgetPairsForMonths } from "services/budgetBuilder";
import {
  accountKey,
  balanceSeries,
  budgetComparison,
  chartMonths,
  incomeOutgoingSeries,
  OTHER_KEY,
  spendingBreakdown,
} from "services/chartData";
import {
  BudgetTypeUser,
  IAccount,
  IBudget,
  IStatement,
  IUserdata,
} from "store/userdata/userdata.types";
import { DATE_FORMAT } from "helpers/dateHelper";

vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 11, 12) });
afterAll(() => {
  vi.useRealTimers();
});

const MAIN = 1;
const CARD = 2;
const month = moment().startOf("M");
const prev = month.clone().add(-1, "M");
const day = (m: moment.Moment, d: number) =>
  m.clone().date(d).format(DATE_FORMAT);

const account = (id: number): IAccount => ({
  id,
  name: `account ${id}`,
  dateCreated: day(prev, 1),
  leftFromPrevMonth: [],
});

const budget = (
  id: number,
  type: BudgetTypeUser,
  accountId: number,
  amount: number,
  extra: Partial<IBudget> = {},
): IBudget => ({
  id,
  name: `budget ${id}`,
  toAccountId: 0,
  isEssential: false,
  amounts: [
    {
      expression: [{ kind: "number", value: amount }],
      fromAccountId: accountId,
      frequency: 1,
      startDate: day(month.clone().add(-2, "M"), 1),
    },
  ],
  overrides: [],
  type,
  closeAfterOneStatement: false,
  dateCreated: day(prev, 1),
  ...extra,
});

let nextId = 1;
const statement = (
  budgetId: number,
  accountId: number,
  amount: number,
): IStatement => ({
  id: nextId++,
  budgetId,
  accountId,
  amount,
  date: day(prev, 5),
  dateCreated: day(prev, 5),
});

const FOOD = 2;
const SNACKS = 3;
const RENT = 4;
const SAVINGS = 6;

// statements only last month, so this month is all planned
const data = (): Omit<IUserdata, "preferences"> => ({
  accounts: [account(MAIN), account(CARD)],
  budgets: [
    budget(1, BudgetTypeUser.income, MAIN, 1000),
    budget(FOOD, BudgetTypeUser.spending, MAIN, 300),
    budget(SNACKS, BudgetTypeUser.spending, MAIN, 50, { parentId: FOOD }),
    budget(RENT, BudgetTypeUser.spending, CARD, 500),
    budget(5, BudgetTypeUser.transferToAccount, MAIN, 200, {
      toAccountId: CARD,
    }),
    budget(SAVINGS, BudgetTypeUser.savings, MAIN, 100),
  ],
  statements: [
    statement(1, MAIN, 900),
    statement(FOOD, MAIN, 320),
    statement(SNACKS, MAIN, 40),
    statement(RENT, CARD, 500),
    statement(5, MAIN, 200),
  ],
  closedMonths: [],
});

const months = chartMonths(-1, 1);
const build = (d = data()) =>
  buildBudgetPairsForMonths(months[0].month, months[2].month, d);

describe("chartData", () => {
  it("chartMonths marks the months after the current one as forecast", () => {
    expect(months.map((m) => [m.key, m.isForecast])).toEqual([
      ["2026-05", false],
      ["2026-06", false],
      ["2026-07", true],
    ]);
  });

  it("income and outgoings use actual amounts in the past, planned after", () => {
    const rows = incomeOutgoingSeries(build(), months);

    // savings had no statement last month, the transfer is no outgoing
    expect(rows[0]).toEqual({
      month: "2026-05",
      income: 900,
      outgoings: 860,
      net: 40,
    });
    expect(rows[1]).toEqual({
      month: "2026-06",
      income: 1000,
      outgoings: 950,
      net: 50,
    });

    expect(incomeOutgoingSeries(build(), months, CARD)[1]).toMatchObject({
      income: 0,
      outgoings: 500,
    });
  });

  it("the balance carries over and a transfer doesn't change the total", () => {
    const d = data();
    const rows = balanceSeries(build(d), d.accounts, months);

    expect(rows[0]).toEqual({
      month: "2026-05",
      [accountKey(MAIN)]: 340,
      [accountKey(CARD)]: -300,
      total: 40,
    });
    expect(rows[1]).toEqual({
      month: "2026-06",
      [accountKey(MAIN)]: 690,
      [accountKey(CARD)]: -600,
      total: 90,
    });
  });

  it("compares budgets with their children and opens the children", () => {
    const d = data();
    const bpa = build(d);

    expect(budgetComparison(bpa, d.budgets, month)).toEqual([
      {
        budgetId: RENT,
        name: "budget 4",
        planned: 500,
        actual: 0,
        hasChildren: false,
      },
      {
        budgetId: FOOD,
        name: "budget 2",
        planned: 350,
        actual: 0,
        hasChildren: true,
      },
      {
        budgetId: SAVINGS,
        name: "budget 6",
        planned: 100,
        actual: 0,
        hasChildren: false,
      },
    ]);
    expect(
      budgetComparison(bpa, d.budgets, prev, FOOD).map((r) => [
        r.budgetId,
        r.planned,
        r.actual,
      ]),
    ).toEqual([[SNACKS, 50, 40]]);
    expect(budgetComparison(bpa, d.budgets, month, undefined, CARD)).toEqual([
      expect.objectContaining({ budgetId: RENT }),
    ]);
  });

  it("splits spending by budget, the smaller ones as other", () => {
    const d = data();
    d.budgets.push(budget(7, BudgetTypeUser.spending, MAIN, 20));
    const { series, rows } = spendingBreakdown(
      build(d),
      d.budgets,
      months,
      undefined,
      1,
    );

    expect(series).toEqual([
      { key: `b${RENT}`, name: "budget 4" },
      { key: OTHER_KEY, name: OTHER_KEY },
    ]);
    // food 320 + 40, and budget 7 had nothing last month
    expect(rows[0]).toEqual({
      month: "2026-05",
      [`b${RENT}`]: 500,
      other: 360,
    });
    expect(rows[1]).toEqual({
      month: "2026-06",
      [`b${RENT}`]: 500,
      other: 370,
    });
  });

  it("shows every budget when only one would be other", () => {
    const d = data();
    const { series } = spendingBreakdown(
      build(d),
      d.budgets,
      months,
      undefined,
      1,
    );
    // in the order of the budgets
    expect(series.map((s) => s.key)).toEqual([`b${FOOD}`, `b${RENT}`]);
  });
});
