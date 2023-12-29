import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { BudgetMonth } from "types/BudgetMonth";
import useBudgetAggregate from "./useBudgetAggregate";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
} from "store/userdata/userdata.types";
import { isActive, toActiveBudget } from "types/BudgetItems";
import { range } from "helpers/arrayHelper";
import { getById } from "helpers/userdata";
import { getRelevantAmount } from "helpers/budgetHelper";
import {
  RelevantFormula,
  getEstimation,
  getRelevantFormulas,
} from "services/budgetCalculator";
import { calculate } from "helpers/evalHelper";
import { BudgetPair, BudgetStatement } from "services/budgetBuilder";

export const useBudget = (start: number, end: number) => {
  const relativeMonths = range(start, end);
  const {
    budgets: budgetList,
    statements: statementList,
    accounts: accountList,
  } = useSelector((state: AppState) => state.data.userdata);

  const beforeFirstMonth = moment().add(start - 1, "M");

  let { budgetMonth: prevMonth } = useBudgetAggregate(
    beforeFirstMonth.toDate()
  );

  const activeBudgets: IActiveBudget[] = [];

  const budgetMonths = relativeMonths.map((rm) => {
    const budget = new BudgetMonth(
      moment().add(rm, "M").toDate(),
      budgetList,
      statementList,
      accountList,
      prevMonth
    );

    prevMonth = budget;

    const activeItems = budget.list.filter((i) => isActive(i));
    activeItems.forEach((item) => {
      if (!activeBudgets.find((ab) => ab.budgetId === item.id)) {
        activeBudgets.push(toActiveBudget(item));
        if (item.type === BudgetTypeUser.transferToAccount) {
          activeBudgets.push(
            toActiveBudget(
              item,
              BudgetTypeExtra.transferFromAccount,
              item.budget.toAccountId,
              getById(accountList, item.budget.fromAccountId)?.name
            )
          );
        }
      }
    });

    return budget;
  });

  // calculate budget planned
  for (let relativeMonth of relativeMonths) {
    // add from prev account

    const relativeMoment = moment().add(relativeMonth);
    const relevantFormulas = budgetList.reduce(
      (prev: RelevantFormula[], cur) => {
        const formulas = getRelevantFormulas(relativeMoment.toDate(), cur);
        return [...prev, ...formulas];
      },
      []
    );

    for (let i = 0; i < relevantFormulas.length; i++) {
      const f = relevantFormulas.shift();
      if (!f) {
        throw Error("something went wrong");
      }

      const rawAmount = calculate(f.formula);
      if (
        rawAmount === undefined ||
        rawAmount === typeof "string" ||
        isNaN(rawAmount as number)
      ) {
        relevantFormulas.push(f);
        continue;
      }

      const planned = rawAmount as number;

      const statements = statementList.filter(
        (s) =>
          moment(s.date).isSame(relativeMoment, "M") &&
          s.budgetId === f.budgetId &&
          s.accountId === f.accountId
      );
      const actual = statements.reduce((prev, cur) => prev + cur.amount, 0);
      const estimate = getEstimation(planned, actual);

      const pair = new BudgetPair(
        f.budgetId,
        f.accountId,
        relativeMoment,
        BudgetTypeUser.income,
        planned,
        actual,
        true,
        statements
      );
    }
  }

  // get list of statements

  // create budget pair array
  // populate budget pair array

  // return budget pair array, budget id tree

  return { budgetMonths, activeBudgets };
};

export default useBudget;

export interface IActiveBudget {
  budgetId: number;
  type: BudgetType;
  name: string;
  accountId: number;
  children: IActiveBudget[];
}
