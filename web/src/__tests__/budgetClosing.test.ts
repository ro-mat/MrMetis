import moment from "moment";
import {
  ClosingData,
  closeBudget,
  closeMonth,
  getLeftForNextMonth,
  isPairClosed,
  isStatementLocked,
  migrateExpectOneStatement,
  openBudget,
  openMonth,
} from "services/budgetClosing";
import { buildBudgetPairsForMonth } from "services/budgetBuilder";
import { flattenBudgetPairs } from "helpers/budgetMapper";
import { calculateForNextMonth } from "services/budgetTotals";
import reducer, {
  ADD_STATEMENT,
  CLOSE_BUDGET,
  DELETE_STATEMENT,
  SET_USERDATA,
  UPDATE_STATEMENT,
} from "store/userdata/userdata.slice";
import {
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
  IBudget,
  IStatement,
  IUserdataState,
} from "store/userdata/userdata.types";
import { DATE_FORMAT } from "helpers/dateHelper";

vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 11, 12) });
afterAll(() => {
  vi.useRealTimers();
});

const MAIN = 1;
const CARD = 2;
const month = moment().startOf("M");
const day = (d: number) => month.clone().date(d).format(DATE_FORMAT);

const account = (id: number): IAccount => ({
  id,
  name: `account ${id}`,
  dateCreated: day(1),
  leftFromPrevMonth: [],
});

const budget = (
  id: number,
  plans: [accountId: number, amount: string][],
  extra: Partial<IBudget> = {}
): IBudget => ({
  id,
  name: `budget ${id}`,
  toAccountId: 0,
  isEssential: false,
  amounts: plans.map(([fromAccountId, amount]) => ({
    amount,
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

const statement = (
  id: number,
  budgetId: number,
  accountId: number,
  amount: number,
  date = day(5)
): IStatement => ({
  id,
  budgetId,
  accountId,
  amount,
  date,
  dateCreated: date,
});

// budget 1 is planned on both accounts, budget 2 is its child on MAIN
const data = (): ClosingData => ({
  budgets: [
    budget(1, [
      [MAIN, "100"],
      [CARD, "50"],
    ]),
    budget(2, [[MAIN, "30"]], { parentId: 1 }),
    budget(3, [[MAIN, "10"]]),
  ],
  statements: [
    statement(1, 1, MAIN, 40),
    statement(2, 1, MAIN, 25.5),
    statement(3, 1, CARD, 20),
    statement(4, 2, MAIN, 12),
  ],
  accounts: [account(MAIN), account(CARD)],
  closedMonths: [],
});

const closedOf = (d: ClosingData, budgetId: number) =>
  d.budgets.find((b) => b.id === budgetId)!.closed ?? [];

describe("budgetClosing", () => {
  it("closing for one account stores its statement sum", () => {
    const d = data();
    closeBudget(d, 1, month, MAIN);

    expect(closedOf(d, 1)).toEqual([
      { month: day(1), accountId: MAIN, actual: 65.5 },
    ]);
    const b1 = d.budgets[0];
    expect(isPairClosed(b1, month, MAIN, [])).toBe(true);
    expect(isPairClosed(b1, month, CARD, [])).toBe(false);
  });

  it("closing the last open account closes the whole month of the budget", () => {
    const d = data();
    closeBudget(d, 1, month, MAIN);
    closeBudget(d, 1, month, CARD);

    expect(closedOf(d, 1)).toContainEqual({
      month: day(1),
      accountId: 0,
      actual: 85.5,
    });
    expect(isPairClosed(d.budgets[0], month, 3, [])).toBe(true);
  });

  it("closing for every account closes each account and the month", () => {
    const d = data();
    closeBudget(d, 1, month);

    expect(
      closedOf(d, 1)
        .map((c) => c.accountId)
        .sort()
    ).toEqual([0, MAIN, CARD]);
  });

  it("closing a parent closes its children for the same account", () => {
    const d = data();
    closeBudget(d, 1, month, MAIN);

    expect(closedOf(d, 2)).toContainEqual({
      month: day(1),
      accountId: MAIN,
      actual: 12,
    });
    expect(closedOf(d, 3)).toHaveLength(0);
  });

  it("opening a child opens its parent and the month", () => {
    const d = data();
    closeMonth(d, month, []);
    openBudget(d, 2, month, MAIN);

    expect(closedOf(d, 2).some((c) => c.accountId === MAIN)).toBe(false);
    expect(closedOf(d, 2).some((c) => c.accountId === 0)).toBe(false);
    expect(closedOf(d, 1).map((c) => c.accountId)).toEqual([CARD]);
    expect(d.closedMonths).toHaveLength(0);
    // other budgets stay closed
    expect(closedOf(d, 3)).toHaveLength(2);
  });

  it("opening a budget opens its children but not its siblings", () => {
    const d = data();
    d.budgets.push(
      budget(5, [[MAIN, "5"]], { parentId: 2 }),
      budget(6, [[MAIN, "6"]], { parentId: 1 })
    );
    closeBudget(d, 1, month, MAIN);
    expect(isPairClosed(d.budgets[3], month, MAIN, [])).toBe(true);

    openBudget(d, 2, month, MAIN);
    expect(isPairClosed(d.budgets[3], month, MAIN, [])).toBe(false);
    expect(isPairClosed(d.budgets[0], month, MAIN, [])).toBe(false);
    expect(isPairClosed(d.budgets[4], month, MAIN, [])).toBe(true);

    openBudget(d, 1, month, MAIN);
    expect(isPairClosed(d.budgets[4], month, MAIN, [])).toBe(false);
  });

  it("closing a month closes every budget and stores what is left", () => {
    const d = data();
    closeMonth(d, month, [
      { month: day(1), accountId: MAIN, amount: 12.3 },
      { month: day(1), accountId: CARD, amount: -20 },
    ]);

    expect(d.closedMonths).toEqual([day(1)]);
    for (const b of d.budgets) {
      expect(closedOf(d, b.id).some((c) => c.accountId === 0)).toBe(true);
    }
    const next = month.clone().add(1, "M").format(DATE_FORMAT);
    expect(d.accounts[0].leftFromPrevMonth).toEqual([
      { month: next, accountId: MAIN, amount: 12.3 },
    ]);
    expect(d.accounts[1].leftFromPrevMonth).toEqual([
      { month: next, accountId: CARD, amount: -20 },
    ]);
  });

  it("opening a month leaves its budgets closed", () => {
    const d = data();
    closeMonth(d, month, []);
    openMonth(d, month);

    expect(d.closedMonths).toHaveLength(0);
    expect(isPairClosed(d.budgets[0], month, MAIN, [])).toBe(true);
  });

  it("isStatementLocked checks the budget, account and month", () => {
    const d = data();
    closeBudget(d, 1, month, MAIN);

    expect(isStatementLocked(d, statement(9, 1, MAIN, 1))).toBe(true);
    expect(isStatementLocked(d, statement(9, 1, CARD, 1))).toBe(false);
    const nextMonth = month.clone().add(1, "M").format(DATE_FORMAT);
    expect(isStatementLocked(d, statement(9, 1, MAIN, 1, nextMonth))).toBe(
      false
    );

    d.closedMonths.push(day(1));
    expect(isStatementLocked(d, statement(9, 3, CARD, 1))).toBe(true);
  });

  it("closing the receiving side of a transfer closes the whole budget", () => {
    const d = data();
    d.budgets.push(
      budget(4, [[MAIN, "70"]], {
        type: BudgetTypeUser.transferToAccount,
        toAccountId: CARD,
      })
    );
    closeBudget(d, 4, month, CARD);

    expect(
      closedOf(d, 4)
        .map((c) => c.accountId)
        .sort()
    ).toEqual([0, MAIN]);
  });

  it("migrates expectOneStatement and closes pairs with statements", () => {
    const d = data();
    const legacy = d.budgets[2] as IBudget & { expectOneStatement?: boolean };
    legacy.expectOneStatement = true;
    d.statements.push(statement(5, 3, MAIN, 10));

    expect(migrateExpectOneStatement(d)).toBe(true);
    expect(legacy.expectOneStatement).toBe(undefined);
    expect(d.budgets[2].closeAfterOneStatement).toBe(true);
    expect(isPairClosed(d.budgets[2], month, MAIN, [])).toBe(true);
    expect(migrateExpectOneStatement(d)).toBe(false);
  });
});

describe("calculating closed budgets", () => {
  const build = (d: ClosingData) => {
    const prev = buildBudgetPairsForMonth(
      month.clone().add(-1, "M"),
      d.budgets,
      d.statements,
      d.accounts,
      [],
      d.closedMonths
    );
    return buildBudgetPairsForMonth(
      month,
      d.budgets,
      d.statements,
      d.accounts,
      prev.list,
      d.closedMonths
    );
  };

  it("a closed pair uses the stored sum and counts with its actual amount", () => {
    const d = data();
    const open = build(d);
    expect(open.getBudgetPair(1, month, MAIN)!.isClosed).toBe(false);
    // planned 100 is still expected on MAIN
    expect(calculateForNextMonth(flattenBudgetPairs(open.list), MAIN)).toBe(
      -140
    );

    closeBudget(d, 1, month, MAIN);
    d.budgets[0].closed![0].actual = 60;
    const closed = build(d);
    const pair = closed.getBudgetPair(1, month, MAIN)!;

    expect(pair.isClosed).toBe(true);
    expect(pair.actual).toBe(60);
    expect(pair.isRemaining()).toBe(false);
    // the child is closed too, so 60 + 12 + 10 are taken
    expect(calculateForNextMonth(flattenBudgetPairs(closed.list), MAIN)).toBe(
      -82
    );
  });

  it("a closed month marks every pair, totals too", () => {
    const d = data();
    closeMonth(d, month, []);
    const array = build(d);

    expect(flattenBudgetPairs(array.list).every((p) => p.isClosed)).toBe(true);
    expect(array.getTotalPair([BudgetTypeUser.spending], month).isClosed).toBe(
      true
    );
  });

  it("left from prev month is closed when the previous month is", () => {
    const d = data();
    const left = () =>
      build(d).getTotalPair([BudgetTypeExtra.leftFromPrevMonth], month, MAIN);
    expect(left().isClosed).toBe(false);

    closeMonth(d, month.clone().add(-1, "M"), [
      { month: day(1), accountId: MAIN, amount: 70 },
    ]);
    expect(left().isClosed).toBe(true);
    expect(left().actual).toBe(70);
    expect(
      build(d).getTotalPair([BudgetTypeUser.spending], month).isClosed
    ).toBe(false);
  });

  it("getLeftForNextMonth counts actual amounts", () => {
    const d = data();
    d.accounts[0].leftFromPrevMonth.push({
      month: day(1),
      accountId: MAIN,
      amount: 200,
    });
    const left = getLeftForNextMonth(build(d), d.accounts, month);

    const next = month.clone().add(1, "M").format(DATE_FORMAT);
    expect(left).toEqual([
      { month: next, accountId: MAIN, amount: 200 - 65.5 - 12 },
      { month: next, accountId: CARD, amount: -20 },
    ]);
  });
});

describe("statements of closed budgets", () => {
  const state = (): IUserdataState =>
    reducer(
      undefined,
      SET_USERDATA({
        ...data(),
        budgets: [
          budget(1, [[MAIN, "100"]], { closeAfterOneStatement: true }),
          budget(3, [[MAIN, "10"]]),
        ],
        statements: [],
      })
    );

  it("a budget closing after one statement closes with its first statement", () => {
    let s = state();
    s = reducer(s, ADD_STATEMENT(statement(0, 1, MAIN, 99)));
    expect(s.userdata.statements).toHaveLength(1);
    expect(s.userdata.budgets[0].closed).toContainEqual({
      month: day(1),
      accountId: MAIN,
      actual: 99,
    });

    // a second one is refused
    s = reducer(s, ADD_STATEMENT(statement(0, 1, MAIN, 1)));
    expect(s.userdata.statements).toHaveLength(1);
  });

  it("statements of a closed budget can't be moved or removed", () => {
    let s = state();
    s = reducer(s, ADD_STATEMENT(statement(0, 3, MAIN, 5)));
    s = reducer(
      s,
      CLOSE_BUDGET({ budgetId: 3, month: day(1), accountId: MAIN })
    );
    const added = s.userdata.statements[0];

    s = reducer(s, UPDATE_STATEMENT({ ...added, budgetId: 1 }));
    expect(s.userdata.statements[0].budgetId).toBe(3);
    s = reducer(s, DELETE_STATEMENT(added.id));
    expect(s.userdata.statements).toHaveLength(1);
  });

  it("loading legacy data migrates it and saves it", () => {
    const s = reducer(
      undefined,
      SET_USERDATA({
        accounts: [account(MAIN)],
        statements: [statement(1, 1, MAIN, 5)],
        budgets: [
          {
            ...budget(1, [[MAIN, "10"]]),
            expectOneStatement: true,
          } as IBudget,
        ],
      })
    );

    expect(s.savePending).toBe(true);
    expect(s.userdata.closedMonths).toEqual([]);
    expect(s.userdata.budgets[0].closeAfterOneStatement).toBe(true);
    expect(isPairClosed(s.userdata.budgets[0], month, MAIN, [])).toBe(true);
  });
});
