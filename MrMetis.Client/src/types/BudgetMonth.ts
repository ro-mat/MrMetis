import { Calculate, getRelevantAmount } from "helpers/budgetHelper";
import moment from "moment";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IAccount,
  IBudget,
  IStatement,
} from "store/userdata/userdata.types";
import { calculate } from "helpers/evalHelper";
import { BudgetMonthAccount } from "./BudgetMonthAccount";
import { BudgetItems, IBudgetPair } from "./BudgetItems";
import { getEnumArray } from "helpers/enumHelper";

export class BudgetMonth extends BudgetItems {
  budgetMonthAccounts: Map<number, BudgetMonthAccount>;
  leftFromPrevMonth!: IBudgetPair;

  constructor(
    month: Date,
    budgets: IBudget[],
    statements: IStatement[],
    accounts: IAccount[],
    prevMonth?: BudgetMonth
  ) {
    super(month);

    this.budgetMonthAccounts = new Map(
      accounts.map((account) => {
        const fromPrevMonth = +calculate(
          account.leftFromPrevMonth.find((l) =>
            moment(l.month).isSame(moment(month), "M")
          )?.amount ?? "0"
        );

        return [
          account.id,
          new BudgetMonthAccount(
            account.id,
            month,
            fromPrevMonth,
            prevMonth?.budgetMonthAccounts.get(account.id)
          ),
        ];
      })
    );

    this.leftFromPrevMonth = {
      planned: prevMonth?.forNextMonth ?? 0,
      actual: [...this.budgetMonthAccounts.values()].reduce(
        (prev, cur) => prev + cur.leftFromPrevMonth.actual,
        0
      ),
    };

    const monthStatements = statements.filter((s) =>
      moment(s.date).isSame(this.month, "M")
    );

    // calculate budgets
    let cur_month = this.getCalc();
    const last_month = prevMonth?.getCalc() ?? new Calculate();

    const budgetAccountMap = getBudgetResolver(budgets);

    let lastLength =
      [...budgetAccountMap.values()].reduce((p, c) => p + c.length, 0) + 1; // increment for the initial loop

    const possibleBudgetTypes = [
      ...getEnumArray(BudgetTypeUser).concat(getEnumArray(BudgetTypeExtra)),
    ];

    const possibleAccountBudgetTypes = new Map<number, BudgetType[]>(
      accounts.map((a) => {
        return [a.id, [...possibleBudgetTypes]];
      })
    );

    // calculate all budget items and formulas
    while (
      [...budgetAccountMap.values()].reduce((p, c) => p + c.length, 0) > 0
    ) {
      if (
        lastLength <=
        [...budgetAccountMap.values()].reduce((p, c) => p + c.length, 0)
      ) {
        const badAmounts = [...budgetAccountMap.values()].reduce(
          (p: string[], c) => {
            const bad = c.reduce((cp: string[], cc) => {
              cp.push(getRelevantAmount(this.month, cc.originalBudget));
              return cp;
            }, []);
            p.push(...bad);
            return p;
          },
          []
        );
        throw Error(
          `Endless loop detected. Problem is in one of these: [${badAmounts.join(
            ", "
          )}]`
        );
      }
      lastLength = [...budgetAccountMap.values()].reduce(
        (p, c) => p + c.length,
        0
      );

      for (let account of accounts) {
        const rawBudgets = budgetAccountMap.get(account.id) ?? [];

        const budgetLength = rawBudgets.length;
        if (budgetLength > 0) {
          for (let i = 0; i < budgetLength; i++) {
            const b = rawBudgets.shift()!;

            const formula = getRelevantAmount(this.month, b.originalBudget);
            const rawAmount = calculate(formula, cur_month, last_month);
            if (
              rawAmount === undefined ||
              rawAmount === typeof "string" ||
              isNaN(rawAmount as number)
            ) {
              rawBudgets.push(b);
              continue;
            }

            const amount = rawAmount as number;
            const item = this.addItem(b, amount, monthStatements);
            if (!item) {
              // failed to add
              rawBudgets.push(b);
              continue;
            }

            b.actual = item.actual;
            b.planned = item.planned;
            this.addToAccount(account.id, b, item.statements);
          }
          budgetAccountMap.set(account.id, rawBudgets);
        }

        // calculate possible account totals
        const possibleAccountBudgetType = possibleAccountBudgetTypes.get(
          account.id
        )!;
        for (let j = 0; j < possibleAccountBudgetType.length; ) {
          const budgetType = possibleAccountBudgetType[j];
          if (rawBudgets.find((bud) => bud.type === budgetType)) {
            j++;
            continue;
          }

          let acc = this.budgetMonthAccounts.get(account.id)!;
          acc.trySetTotal(budgetType);

          possibleAccountBudgetType.splice(
            possibleAccountBudgetType.indexOf(budgetType),
            1
          );
        }

        possibleAccountBudgetTypes.set(account.id, possibleAccountBudgetType)!;
      }

      //calculate possible overall totals
      for (let p = 0; p < possibleBudgetTypes.length; ) {
        const possibleBudgetType = possibleBudgetTypes[p];
        if (
          [...possibleAccountBudgetTypes.values()].filter((v) =>
            v.includes(possibleBudgetType)
          ).length > 0
        ) {
          p++;
          continue;
        }

        this.trySetTotal(possibleBudgetType);
        possibleBudgetTypes.splice(
          possibleBudgetTypes.indexOf(possibleBudgetType),
          1
        );
      }

      cur_month = this.getCalc();
    }
  }

  private addToAccount = (
    accountId: number,
    budgetResolver: IBudgetResolver,
    statements: IStatement[]
  ) => {
    const acc = this.budgetMonthAccounts.get(accountId);
    if (!acc) {
      return;
    }

    acc.addItem(
      budgetResolver,
      budgetResolver.planned,
      statements,
      budgetResolver.actual
    );
  };
}

const getBudgetResolver = (budgets: IBudget[]) => {
  return budgets.reduce((prev, cur) => {
    if (!prev.has(cur.fromAccountId ?? 0)) {
      prev.set(cur.fromAccountId ?? 0, []);
    }

    const mapItem = prev.get(cur.fromAccountId ?? 0)!;
    mapItem.push({
      budgetId: cur.id,
      budgetName: cur.name,
      parentId: cur.parentId,
      type: cur.type,
      originalBudget: cur,
    } as IBudgetResolver);

    if (cur.type === BudgetTypeUser.transferToAccount) {
      const mapItem = prev.get(cur.toAccountId)!;
      mapItem.push({
        budgetId: cur.id,
        budgetName: cur.name,
        parentId: cur.parentId,
        type: BudgetTypeExtra.transferFromAccount,
        originalBudget: cur,
      } as IBudgetResolver);
    }

    return prev;
  }, new Map<number, IBudgetResolver[]>());
};

export interface IBudgetResolver extends IBudgetPair {
  budgetId: number;
  budgetName: string;
  parentId?: number;
  type: BudgetType;
  originalBudget: IBudget;
}
