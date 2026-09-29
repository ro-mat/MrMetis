import { getDemoData, initDemoData } from "helpers/demoHelper";
import moment from "moment";
import { buildBudgetPairsForMonth } from "services/budgetBuilder";
import { BudgetPair, BudgetStatement } from "services/budgetPair";
import { BudgetPairArray } from "services/budgetPairArray";
import {
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
  IBudget,
} from "store/userdata/userdata.types";

describe("budgetBuilder", () => {
  beforeEach(() => {
    initDemoData();
  });

  it("buildBudgetPairsForMonth for last month should return correct budget pair tree", () => {
    const { budgets, statements, accounts } = getDemoData();
    const prevMonthMoment = moment().add(-1, "M");
    const prevMonthBudgetPairs = buildBudgetPairsForMonth(
      prevMonthMoment,
      budgets,
      statements,
      accounts,
      []
    );

    expect(prevMonthBudgetPairs.list.length).toBe(60);

    const leftFromPrevMonth = prevMonthBudgetPairs.getTotalPair(
      [BudgetTypeExtra.leftFromPrevMonth],
      prevMonthMoment
    )!;
    expect(leftFromPrevMonth).not.toBe(undefined);
    expect(leftFromPrevMonth.planned).toBe(0);
    expect(leftFromPrevMonth.actual).toBe(43);
    expect(leftFromPrevMonth.isActive()).toBe(true);
    expect(leftFromPrevMonth.children).toHaveLength(0);

    const salary = prevMonthBudgetPairs.getBudgetPair(1, prevMonthMoment)!;
    expect(salary).not.toBe(undefined);
    expect(salary.planned).toBe(1630);
    expect(salary.actual).toBe(1636.2);
    expect(salary.isActive()).toBe(true);
    expect(salary.children).toHaveLength(0);

    const aptLoan = prevMonthBudgetPairs.getBudgetPair(2, prevMonthMoment)!;
    expect(aptLoan).not.toBe(undefined);
    expect(aptLoan.planned).toBe(480);
    expect(aptLoan.actual).toBe(480);
    expect(aptLoan.isActive()).toBe(true);
    expect(aptLoan.children).toHaveLength(0);

    const groceries = prevMonthBudgetPairs.getBudgetPair(3, prevMonthMoment)!;
    expect(groceries).not.toBe(undefined);
    expect(groceries.planned).toBe(250);
    expect(groceries.actual).toBe(213.4);
    expect(groceries.isActive()).toBe(true);
    expect(groceries.children).toHaveLength(1);
    expect(groceries.getChildrenPlanned()).toBe(60);
    expect(groceries.getChildrenActual()).toBe(63.4);

    const alcohol = prevMonthBudgetPairs.getBudgetPair(4, prevMonthMoment)!;
    expect(alcohol).not.toBe(undefined);
    expect(alcohol.planned).toBe(60);
    expect(alcohol.actual).toBe(63.4);
    expect(alcohol.isActive()).toBe(true);
    expect(alcohol.children).toHaveLength(0);

    const sport = prevMonthBudgetPairs.getBudgetPair(7, prevMonthMoment)!;
    expect(sport).not.toBe(undefined);
    expect(sport.planned).toBe(0);
    expect(sport.actual).toBe(0);
    expect(sport.isActive()).toBe(true);
    expect(sport.children).toHaveLength(1);

    const gym = prevMonthBudgetPairs.getBudgetPair(8, prevMonthMoment)!;
    expect(gym).not.toBe(undefined);
    expect(gym.planned).toBe(119);
    expect(gym.actual).toBe(119);
    expect(gym.isActive()).toBe(true);
    expect(gym.children).toHaveLength(0);

    const bills = prevMonthBudgetPairs.getBudgetPair(9, prevMonthMoment)!;
    expect(bills).not.toBe(undefined);
    expect(bills.planned).toBe(0);
    expect(bills.actual).toBe(0);
    expect(bills.isActive()).toBe(true);
    expect(bills.children).toHaveLength(5);
    expect(bills.getChildrenPlanned()).toBe(109);
    expect(bills.getChildrenActual()).toBe(93.5);

    const internet = prevMonthBudgetPairs.getBudgetPair(5, prevMonthMoment)!;
    expect(internet).not.toBe(undefined);
    expect(internet.planned).toBe(29);
    expect(internet.actual).toBe(28.9);
    expect(internet.isActive()).toBe(true);
    expect(internet.children).toHaveLength(0);

    const phone = prevMonthBudgetPairs.getBudgetPair(6, prevMonthMoment)!;
    expect(phone).not.toBe(undefined);
    expect(phone.planned).toBe(15);
    expect(phone.actual).toBe(9.8);
    expect(phone.isActive()).toBe(true);
    expect(phone.children).toHaveLength(0);

    const electricity = prevMonthBudgetPairs.getBudgetPair(
      10,
      prevMonthMoment
    )!;
    expect(electricity).not.toBe(undefined);
    expect(electricity.planned).toBe(30);
    expect(electricity.actual).toBe(27);
    expect(electricity.isActive()).toBe(true);
    expect(electricity.children).toHaveLength(0);

    const water = prevMonthBudgetPairs.getBudgetPair(11, prevMonthMoment)!;
    expect(water).not.toBe(undefined);
    expect(water.planned).toBe(15);
    expect(water.actual).toBe(13.6);
    expect(water.isActive()).toBe(true);
    expect(water.children).toHaveLength(0);

    const gas = prevMonthBudgetPairs.getBudgetPair(12, prevMonthMoment)!;
    expect(gas).not.toBe(undefined);
    expect(gas.planned).toBe(20);
    expect(gas.actual).toBe(14.2);
    expect(gas.isActive()).toBe(true);
    expect(gas.children).toHaveLength(0);

    const longTermSaving = prevMonthBudgetPairs.getBudgetPair(
      13,
      prevMonthMoment
    )!;
    expect(longTermSaving).not.toBe(undefined);
    expect(longTermSaving.planned).toBe(2);
    expect(longTermSaving.actual).toBe(2);
    expect(longTermSaving.isActive()).toBe(true);
    expect(longTermSaving.children).toHaveLength(0);

    const shortTermSaving = prevMonthBudgetPairs.getBudgetPair(
      14,
      prevMonthMoment
    )!;
    expect(shortTermSaving).not.toBe(undefined);
    expect(shortTermSaving.planned).toBe(100);
    expect(shortTermSaving.actual).toBe(100);
    expect(shortTermSaving.isActive()).toBe(true);
    expect(shortTermSaving.children).toHaveLength(0);

    const goingOut = prevMonthBudgetPairs.getBudgetPair(15, prevMonthMoment)!;
    expect(goingOut).not.toBe(undefined);
    expect(goingOut.planned).toBe(250);
    expect(goingOut.actual).toBe(266.4);
    expect(goingOut.isActive()).toBe(true);
    expect(goingOut.children).toHaveLength(0);
    expect(shortTermSaving.children).toHaveLength(0);

    const kidsAllowance = prevMonthBudgetPairs.getBudgetPair(
      16,
      prevMonthMoment
    )!;
    expect(kidsAllowance).not.toBe(undefined);
    expect(kidsAllowance.planned).toBe(150);
    expect(kidsAllowance.actual).toBe(130);
    expect(kidsAllowance.isActive()).toBe(true);
    expect(kidsAllowance.children).toHaveLength(0);

    const sendToCC = prevMonthBudgetPairs.getBudgetPair(17, prevMonthMoment)!;
    expect(sendToCC).not.toBe(undefined);
    expect(sendToCC.planned).toBe(780 * 2);
    expect(sendToCC.actual).toBe(780 * 2);
    expect(sendToCC.isActive()).toBe(true);
    expect(sendToCC.children).toHaveLength(0);

    const cashWithdrawal = prevMonthBudgetPairs.getBudgetPair(
      18,
      prevMonthMoment
    )!;
    expect(cashWithdrawal).not.toBe(undefined);
    expect(cashWithdrawal.planned).toBe(170 * 2);
    expect(cashWithdrawal.actual).toBe(170 * 2);
    expect(cashWithdrawal.isActive()).toBe(true);
    expect(cashWithdrawal.children).toHaveLength(0);

    const unplanned = prevMonthBudgetPairs.getBudgetPair(19, prevMonthMoment)!;
    expect(unplanned).not.toBe(undefined);
    expect(unplanned.planned).toBe(110);
    expect(unplanned.actual).toBe(20);
    expect(unplanned.isActive()).toBe(true);
    expect(unplanned.children).toHaveLength(0);

    const unplanned1 = prevMonthBudgetPairs.getBudgetPair(
      19,
      prevMonthMoment,
      1
    )!;
    expect(unplanned1).not.toBe(undefined);
    expect(unplanned1.planned).toBe(40);
    expect(unplanned1.actual).toBe(20);
    expect(unplanned1.isActive()).toBe(true);
    expect(unplanned1.children).toHaveLength(0);

    const unplanned2 = prevMonthBudgetPairs.getBudgetPair(
      19,
      prevMonthMoment,
      2
    )!;
    expect(unplanned2).not.toBe(undefined);
    expect(unplanned2.planned).toBe(50);
    expect(unplanned2.actual).toBe(0);
    expect(unplanned2.isActive()).toBe(true);
    expect(unplanned2.children).toHaveLength(0);

    const unplanned3 = prevMonthBudgetPairs.getBudgetPair(
      19,
      prevMonthMoment,
      3
    )!;
    expect(unplanned3).not.toBe(undefined);
    expect(unplanned3.planned).toBe(20);
    expect(unplanned3.actual).toBe(0);
    expect(unplanned3.isActive()).toBe(true);
    expect(unplanned3.children).toHaveLength(0);
  });

  it("buildBudgetPairsForMonth for current month should return correct budget pair tree", () => {
    const { budgets, statements, accounts } = getDemoData();
    const prevMontMoment = moment().add(-1, "M");
    const budgetPairsFromPrevMonth = buildBudgetPairsForMonth(
      prevMontMoment,
      budgets,
      statements,
      accounts,
      []
    );
    const curMonthMoment = moment();
    const curMonthBudgetPairs = buildBudgetPairsForMonth(
      curMonthMoment,
      budgets,
      statements,
      accounts,
      budgetPairsFromPrevMonth.list
    );

    expect(curMonthBudgetPairs.list.length).toBe(60);

    const salary = curMonthBudgetPairs.getBudgetPair(1, curMonthMoment)!;
    expect(salary).not.toBe(undefined);
    expect(salary.planned).toBe(1630);
    expect(salary.actual).toBe(1635.8);
    expect(salary.isActive()).toBe(true);
    expect(salary.children).toHaveLength(0);

    const aptLoan = curMonthBudgetPairs.getBudgetPair(2, curMonthMoment)!;
    expect(aptLoan).not.toBe(undefined);
    expect(aptLoan.planned).toBe(480);
    expect(aptLoan.actual).toBe(480);
    expect(aptLoan.isActive()).toBe(true);
    expect(aptLoan.children).toHaveLength(0);

    const groceries = curMonthBudgetPairs.getBudgetPair(3, curMonthMoment)!;
    expect(groceries).not.toBe(undefined);
    expect(groceries.planned).toBe(200);
    expect(groceries.actual).toBe(71.5);
    expect(groceries.isActive()).toBe(true);
    expect(groceries.children).toHaveLength(1);
    expect(groceries.getChildrenPlanned()).toBe(60);
    expect(groceries.getChildrenActual()).toBe(0);

    const alcohol = curMonthBudgetPairs.getBudgetPair(4, curMonthMoment)!;
    expect(alcohol).not.toBe(undefined);
    expect(alcohol.planned).toBe(60);
    expect(alcohol.actual).toBe(0);
    expect(alcohol.isActive()).toBe(true);
    expect(alcohol.children).toHaveLength(0);

    const sport = curMonthBudgetPairs.getBudgetPair(7, curMonthMoment)!;
    expect(sport).not.toBe(undefined);
    expect(sport.planned).toBe(0);
    expect(sport.actual).toBe(0);
    expect(sport.isActive()).toBe(false);
    expect(sport.children).toHaveLength(1);

    const gym = curMonthBudgetPairs.getBudgetPair(8, curMonthMoment)!;
    expect(gym).not.toBe(undefined);
    expect(gym.planned).toBe(0);
    expect(gym.actual).toBe(0);
    expect(gym.isActive()).toBe(false);
    expect(gym.children).toHaveLength(0);

    const bills = curMonthBudgetPairs.getBudgetPair(9, curMonthMoment)!;
    expect(bills).not.toBe(undefined);
    expect(bills.planned).toBe(0);
    expect(bills.actual).toBe(0);
    expect(bills.isActive()).toBe(true);
    expect(bills.children).toHaveLength(5);
    expect(bills.getChildrenPlanned()).toBe(109);
    expect(bills.getChildrenActual()).toBe(82.8);

    const internet = curMonthBudgetPairs.getBudgetPair(5, curMonthMoment)!;
    expect(internet).not.toBe(undefined);
    expect(internet.planned).toBe(29);
    expect(internet.actual).toBe(28.9);
    expect(internet.isActive()).toBe(true);
    expect(internet.children).toHaveLength(0);

    const phone = curMonthBudgetPairs.getBudgetPair(6, curMonthMoment)!;
    expect(phone).not.toBe(undefined);
    expect(phone.planned).toBe(15);
    expect(phone.actual).toBe(10.3);
    expect(phone.isActive()).toBe(true);
    expect(phone.children).toHaveLength(0);

    const electricity = curMonthBudgetPairs.getBudgetPair(10, curMonthMoment)!;
    expect(electricity).not.toBe(undefined);
    expect(electricity.planned).toBe(30);
    expect(electricity.actual).toBe(11.5);
    expect(electricity.isActive()).toBe(true);
    expect(electricity.children).toHaveLength(0);

    const water = curMonthBudgetPairs.getBudgetPair(11, curMonthMoment)!;
    expect(water).not.toBe(undefined);
    expect(water.planned).toBe(15);
    expect(water.actual).toBe(16.3);
    expect(water.isActive()).toBe(true);
    expect(water.children).toHaveLength(0);

    const gas = curMonthBudgetPairs.getBudgetPair(12, curMonthMoment)!;
    expect(gas).not.toBe(undefined);
    expect(gas.planned).toBe(20);
    expect(gas.actual).toBe(15.8);
    expect(gas.isActive()).toBe(true);
    expect(gas.children).toHaveLength(0);

    const longTermSaving = curMonthBudgetPairs.getBudgetPair(
      13,
      curMonthMoment
    )!;
    expect(longTermSaving).not.toBe(undefined);
    expect(longTermSaving.planned).toBe(255.7);
    expect(longTermSaving.actual).toBe(255);
    expect(longTermSaving.isActive()).toBe(true);
    expect(longTermSaving.children).toHaveLength(0);

    const shortTermSaving = curMonthBudgetPairs.getBudgetPair(
      14,
      curMonthMoment
    )!;
    expect(shortTermSaving).not.toBe(undefined);
    expect(shortTermSaving.planned).toBe(100);
    expect(shortTermSaving.actual).toBe(100);
    expect(shortTermSaving.isActive()).toBe(true);
    expect(shortTermSaving.children).toHaveLength(0);

    const goingOut = curMonthBudgetPairs.getBudgetPair(15, curMonthMoment)!;
    expect(goingOut).not.toBe(undefined);
    expect(goingOut.planned).toBe(250);
    expect(goingOut.actual).toBe(63.5);
    expect(goingOut.isActive()).toBe(true);
    expect(goingOut.children).toHaveLength(0);
    expect(shortTermSaving.children).toHaveLength(0);

    const kidsAllowance = curMonthBudgetPairs.getBudgetPair(
      16,
      curMonthMoment
    )!;
    expect(kidsAllowance).not.toBe(undefined);
    expect(kidsAllowance.planned).toBe(150);
    expect(kidsAllowance.actual).toBe(120);
    expect(kidsAllowance.isActive()).toBe(true);
    expect(kidsAllowance.children).toHaveLength(0);

    const sendToCC = curMonthBudgetPairs.getBudgetPair(17, curMonthMoment)!;
    expect(sendToCC).not.toBe(undefined);
    expect(sendToCC.planned).toBe(730 * 2);
    expect(sendToCC.actual).toBe(730 * 2);
    expect(sendToCC.isActive()).toBe(true);
    expect(sendToCC.children).toHaveLength(0);

    const cashWithdrawal = curMonthBudgetPairs.getBudgetPair(
      18,
      curMonthMoment
    )!;
    expect(cashWithdrawal).not.toBe(undefined);
    expect(cashWithdrawal.planned).toBe(170 * 2);
    expect(cashWithdrawal.actual).toBe(170 * 2);
    expect(cashWithdrawal.isActive()).toBe(true);
    expect(cashWithdrawal.children).toHaveLength(0);

    const unplanned = curMonthBudgetPairs.getBudgetPair(19, curMonthMoment)!;
    expect(unplanned).not.toBe(undefined);
    expect(unplanned.planned).toBe(110);
    expect(unplanned.actual).toBe(25);
    expect(unplanned.isActive()).toBe(true);
    expect(unplanned.children).toHaveLength(0);

    const unplanned1 = curMonthBudgetPairs.getBudgetPair(
      19,
      curMonthMoment,
      1
    )!;
    expect(unplanned1).not.toBe(undefined);
    expect(unplanned1.planned).toBe(40);
    expect(unplanned1.actual).toBe(0);
    expect(unplanned1.isActive()).toBe(true);
    expect(unplanned1.children).toHaveLength(0);

    const unplanned2 = curMonthBudgetPairs.getBudgetPair(
      19,
      curMonthMoment,
      2
    )!;
    expect(unplanned2).not.toBe(undefined);
    expect(unplanned2.planned).toBe(50);
    expect(unplanned2.actual).toBe(15.4);
    expect(unplanned2.isActive()).toBe(true);
    expect(unplanned2.children).toHaveLength(0);

    const unplanned3 = curMonthBudgetPairs.getBudgetPair(
      19,
      curMonthMoment,
      3
    )!;
    expect(unplanned3).not.toBe(undefined);
    expect(unplanned3.planned).toBe(20);
    expect(unplanned3.actual).toBe(9.6);
    expect(unplanned3.isActive()).toBe(true);
    expect(unplanned3.children).toHaveLength(0);
  });
});

describe("BudgetPair children", () => {
  const month = moment();

  const statement = (id: number, accountId: number): BudgetStatement => ({
    id,
    accountId,
    date: month.toISOString(),
    amount: 1,
  });

  const makePair = (
    budgetId: number,
    accountId: number,
    planned: number,
    actual: number,
    parentId?: number,
    statements: BudgetStatement[] = []
  ) =>
    new BudgetPair(
      budgetId,
      accountId,
      month,
      BudgetTypeUser.spending,
      planned,
      actual,
      false,
      statements,
      parentId
    );

  // parent 1 has pairs on accounts 1 and 2; children get attached to the first one
  const buildArray = () => {
    const parentAcc1 = makePair(1, 1, 0, 0);
    const parentAcc2 = makePair(1, 2, 0, 0);
    const childAcc1 = makePair(2, 1, 10, 5, 1, [statement(1, 1)]);
    const childAcc2 = makePair(3, 2, 20, 0, 1, [statement(2, 2)]);
    const grandChildAcc2 = makePair(4, 2, 0, 7, 3, [statement(3, 2)]);

    const builder = new BudgetPairArray();
    [parentAcc1, parentAcc2, childAcc1, childAcc2, grandChildAcc2].forEach(
      (p) => builder.tryAddBudgetPair(p)
    );
    return new BudgetPairArray(builder.list);
  };

  it("getBudgetPair finds children attached to another account's parent pair", () => {
    const parent = buildArray().getBudgetPair(1, month, 2)!;

    expect(parent.children).toHaveLength(2);
    expect(parent.getChildrenPlanned(2)).toBe(20);
    expect(parent.getChildrenActual(2)).toBe(7);
  });

  it("hasOwnValues ignores rounding noise", () => {
    expect(makePair(1, 1, 0, 0).hasOwnValues()).toBe(false);
    expect(makePair(1, 1, 1e-9, 0).hasOwnValues()).toBe(false);
    expect(makePair(1, 1, 0, 0.01).hasOwnValues()).toBe(true);
    expect(makePair(1, 1, -5, 0).hasOwnValues()).toBe(true);
  });

  it("hasChildrenValues respects account and checks grandchildren", () => {
    const array = buildArray();
    const parent = array.getBudgetPair(1, month)!;
    expect(parent.hasOwnValues()).toBe(false);
    expect(parent.hasChildrenValues()).toBe(true);
    expect(parent.hasChildrenValues(1)).toBe(true);
    expect(parent.hasChildrenValues(3)).toBe(false);

    // child on account 2 has no actual, only its grandchild does
    const child = array.getBudgetPair(3, month, 2)!;
    expect(child.hasChildrenValues(2)).toBe(true);
    expect(child.hasChildrenValues(1)).toBe(false);
  });

  it("hasChildrenValues is not fooled by values cancelling out", () => {
    const builder = new BudgetPairArray();
    [makePair(1, 1, 0, 0), makePair(2, 1, 10, 0, 1), makePair(3, 1, -10, 0, 1)]
      .forEach((p) => builder.tryAddBudgetPair(p));
    const parent = new BudgetPairArray(builder.list).getBudgetPair(1, month)!;

    expect(parent.getChildrenPlanned()).toBe(0);
    expect(parent.hasChildrenValues()).toBe(true);
  });

  it("getChildrenStatements filters by account", () => {
    const parent = buildArray().getBudgetPair(1, month)!;

    const ids = (accountId?: number) =>
      parent.getChildrenStatements(accountId).map((s) => s.id).sort();
    expect(ids()).toEqual([1, 2, 3]);
    expect(ids(1)).toEqual([1]);
    expect(ids(2)).toEqual([2, 3]);
  });
});

describe("parent and child on different accounts", () => {
  const MAIN = 1;
  const CARD = 2;
  const start = moment().startOf("M");

  const account = (id: number, name: string): IAccount => ({
    id,
    name,
    dateCreated: start.toISOString(),
    leftFromPrevMonth: [],
  });

  const budget = (
    id: number,
    amount: string,
    fromAccountId: number,
    frequency: number,
    parentId?: number
  ): IBudget => ({
    id,
    name: `budget ${id}`,
    parentId,
    fromAccountId: 0,
    toAccountId: 0,
    isEssential: false,
    amounts: [
      { amount, fromAccountId, frequency, startDate: start.toISOString() },
    ],
    overrides: [],
    type: BudgetTypeUser.spending,
    expectOneStatement: false,
    dateCreated: start.toISOString(),
  });

  const build = (month: moment.Moment) =>
    buildBudgetPairsForMonth(
      month,
      [budget(1, "0", CARD, 1), budget(2, "15", MAIN, 6, 1)],
      [],
      [account(MAIN, "Main"), account(CARD, "Card")],
      []
    );

  it("collapsed parent in child's account includes child values", () => {
    const array = build(start);
    const parent = array.getBudgetPair(1, start, MAIN);

    expect(parent).not.toBe(undefined);
    expect(parent!.hasOwnValues()).toBe(false);
    expect(parent!.hasChildrenValues(MAIN)).toBe(true);
    expect(parent!.getChildrenPlanned(MAIN)).toBe(15);

    // parent's own zero amount lives on the card, where the child has nothing
    const cardParent = array.getBudgetPair(1, start, CARD)!;
    expect(cardParent.hasOwnValues()).toBe(false);
    expect(cardParent.hasChildrenValues(CARD)).toBe(false);
  });

  it("collapsed parent has no values in months the child is not planned", () => {
    const month = start.clone().add(1, "M");
    const parent = build(month).getBudgetPair(1, month, MAIN)!;

    expect(parent.hasOwnValues()).toBe(false);
    expect(parent.hasChildrenValues(MAIN)).toBe(false);
  });
});
