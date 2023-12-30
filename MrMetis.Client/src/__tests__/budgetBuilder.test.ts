import { getDemoData, initDemoData } from "helpers/demoHelper";
import moment from "moment";
import { buildBudgetPairsForMonth } from "services/budgetBuilder";

describe("budgetBuilder", () => {
  beforeEach(() => {
    initDemoData();
  });

  it("buildBudgetPairsForMonth for last month should return correct budget pair tree", () => {
    const { budgets, statements, accounts } = getDemoData();
    const prevMonthBudgetPairs = buildBudgetPairsForMonth(
      moment().add(-1, "M"),
      budgets,
      statements,
      accounts,
      []
    );

    expect(prevMonthBudgetPairs.list.length).toBe(14);

    const leftFromPrevMonth = prevMonthBudgetPairs.getBudgetPair(0)!;
    expect(leftFromPrevMonth).not.toBe(undefined);
    expect(leftFromPrevMonth.planned).toBe(0);
    expect(leftFromPrevMonth.actual).toBe(43);
    expect(leftFromPrevMonth.isActive()).toBe(true);
    expect(leftFromPrevMonth.children).toHaveLength(0);

    const salary = prevMonthBudgetPairs.getBudgetPair(1)!;
    expect(salary).not.toBe(undefined);
    expect(salary.planned).toBe(1630);
    expect(salary.actual).toBe(1636.2);
    expect(salary.isActive()).toBe(true);
    expect(salary.children).toHaveLength(0);

    const aptLoan = prevMonthBudgetPairs.getBudgetPair(2)!;
    expect(aptLoan).not.toBe(undefined);
    expect(aptLoan.planned).toBe(480);
    expect(aptLoan.actual).toBe(480);
    expect(aptLoan.isActive()).toBe(true);
    expect(aptLoan.children).toHaveLength(0);

    const groceries = prevMonthBudgetPairs.getBudgetPair(3)!;
    expect(groceries).not.toBe(undefined);
    expect(groceries.planned).toBe(200);
    expect(groceries.actual).toBe(213.4);
    expect(groceries.isActive()).toBe(true);
    expect(groceries.children).toHaveLength(1);
    expect(groceries.getChildrenPlanned()).toBe(60);
    expect(groceries.getChildrenActual()).toBe(63.4);

    const alcohol = prevMonthBudgetPairs.getBudgetPair(4)!;
    expect(alcohol).not.toBe(undefined);
    expect(alcohol.planned).toBe(60);
    expect(alcohol.actual).toBe(63.4);
    expect(alcohol.isActive()).toBe(true);
    expect(alcohol.children).toHaveLength(0);

    const sport = prevMonthBudgetPairs.getBudgetPair(7)!;
    expect(sport).not.toBe(undefined);
    expect(sport.planned).toBe(0);
    expect(sport.actual).toBe(0);
    expect(sport.isActive()).toBe(true);
    expect(sport.children).toHaveLength(1);

    const gym = prevMonthBudgetPairs.getBudgetPair(8)!;
    expect(gym).not.toBe(undefined);
    expect(gym.planned).toBe(119);
    expect(gym.actual).toBe(119);
    expect(gym.isActive()).toBe(true);
    expect(gym.children).toHaveLength(0);

    const bills = prevMonthBudgetPairs.getBudgetPair(9)!;
    expect(bills).not.toBe(undefined);
    expect(bills.planned).toBe(0);
    expect(bills.actual).toBe(0);
    expect(bills.isActive()).toBe(true);
    expect(bills.children).toHaveLength(5);
    expect(bills.getChildrenPlanned()).toBe(109);
    expect(bills.getChildrenActual()).toBe(93.5);

    const internet = prevMonthBudgetPairs.getBudgetPair(5)!;
    expect(internet).not.toBe(undefined);
    expect(internet.planned).toBe(29);
    expect(internet.actual).toBe(28.9);
    expect(internet.isActive()).toBe(true);
    expect(internet.children).toHaveLength(0);

    const phone = prevMonthBudgetPairs.getBudgetPair(6)!;
    expect(phone).not.toBe(undefined);
    expect(phone.planned).toBe(15);
    expect(phone.actual).toBe(9.8);
    expect(phone.isActive()).toBe(true);
    expect(phone.children).toHaveLength(0);

    const electricity = prevMonthBudgetPairs.getBudgetPair(10)!;
    expect(electricity).not.toBe(undefined);
    expect(electricity.planned).toBe(30);
    expect(electricity.actual).toBe(27);
    expect(electricity.isActive()).toBe(true);
    expect(electricity.children).toHaveLength(0);

    const water = prevMonthBudgetPairs.getBudgetPair(11)!;
    expect(water).not.toBe(undefined);
    expect(water.planned).toBe(15);
    expect(water.actual).toBe(13.6);
    expect(water.isActive()).toBe(true);
    expect(water.children).toHaveLength(0);

    const gas = prevMonthBudgetPairs.getBudgetPair(12)!;
    expect(gas).not.toBe(undefined);
    expect(gas.planned).toBe(20);
    expect(gas.actual).toBe(14.2);
    expect(gas.isActive()).toBe(true);
    expect(gas.children).toHaveLength(0);

    const longTermSaving = prevMonthBudgetPairs.getBudgetPair(13)!;
    expect(longTermSaving).not.toBe(undefined);
    expect(longTermSaving.planned).toBe(162);
    expect(longTermSaving.actual).toBe(112);
    expect(longTermSaving.isActive()).toBe(true);
    expect(longTermSaving.children).toHaveLength(0);

    const shortTermSaving = prevMonthBudgetPairs.getBudgetPair(14)!;
    expect(shortTermSaving).not.toBe(undefined);
    expect(shortTermSaving.planned).toBe(100);
    expect(shortTermSaving.actual).toBe(100);
    expect(shortTermSaving.isActive()).toBe(true);
    expect(shortTermSaving.children).toHaveLength(0);

    const goingOut = prevMonthBudgetPairs.getBudgetPair(15)!;
    expect(goingOut).not.toBe(undefined);
    expect(goingOut.planned).toBe(250);
    expect(goingOut.actual).toBe(266.4);
    expect(goingOut.isActive()).toBe(true);
    expect(goingOut.children).toHaveLength(0);
    expect(shortTermSaving.children).toHaveLength(0);

    const kidsAllowance = prevMonthBudgetPairs.getBudgetPair(16)!;
    expect(kidsAllowance).not.toBe(undefined);
    expect(kidsAllowance.planned).toBe(150);
    expect(kidsAllowance.actual).toBe(130);
    expect(kidsAllowance.isActive()).toBe(true);
    expect(kidsAllowance.children).toHaveLength(0);

    const sendToCC = prevMonthBudgetPairs.getBudgetPair(17)!;
    expect(sendToCC).not.toBe(undefined);
    expect(sendToCC.planned).toBe(660);
    expect(sendToCC.actual).toBe(710);
    expect(sendToCC.isActive()).toBe(true);
    expect(sendToCC.children).toHaveLength(0);

    const cashWithdrawal = prevMonthBudgetPairs.getBudgetPair(18)!;
    expect(cashWithdrawal).not.toBe(undefined);
    expect(cashWithdrawal.planned).toBe(150);
    expect(cashWithdrawal.actual).toBe(150);
    expect(cashWithdrawal.isActive()).toBe(true);
    expect(cashWithdrawal.children).toHaveLength(0);
  });
});
