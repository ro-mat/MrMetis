import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "store/store";
import { SET_USERDATA } from "store/userdata/userdata.slice";
import BudgetAddOrEdit from "components/budget/BudgetAddOrEdit";
import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";
import { BudgetTypeUser, IBudget } from "store/userdata/userdata.types";

const account = (id: number, name: string) => ({
  id,
  name,
  dateCreated: "2026-01-01",
  leftFromPrevMonth: [],
});

// loosely typed: stored data may miss fields the types require
const budget = (id: number, props: Record<string, unknown> = {}) =>
  ({
    id,
    dateCreated: "2026-01-01",
    name: `Budget ${id}`,
    toAccountId: 0,
    isEssential: false,
    type: BudgetTypeUser.spending,
    closeAfterOneStatement: false,
    amounts: [],
    overrides: [],
    ...props,
  }) as unknown as IBudget;

// an expression of a single number
const num = (value: number) => [{ kind: "number", value }];

const renderBudget = (id: number) =>
  render(
    <Provider store={store}>
      <BudgetAddOrEdit id={id} onClose={() => {}} />
    </Provider>
  );

// the filterable selects: parent, then from account
const comboboxes = (container: HTMLElement) =>
  container.querySelectorAll<HTMLInputElement>('input[role="combobox"]');
const fromAccountInput = (container: HTMLElement) => comboboxes(container)[1];

describe("BudgetAddOrEdit", () => {
  it("forces the budget account on existing and new amount/override rows", async () => {
    store.dispatch(
      SET_USERDATA({ accounts: [account(1, "Cash"), account(2, "Bank")] })
    );
    const { container } = render(
      <Provider store={store}>
        <BudgetAddOrEdit id={0} onClose={() => {}} />
      </Provider>
    );
    const [addAmount, addOverride] = screen.getAllByText("+");
    const rowSelect = (name: string) =>
      container.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!;

    // rows added before the budget account is chosen
    fireEvent.click(addAmount);
    fireEvent.click(addOverride);
    expect(rowSelect("amounts.0.fromAccountId")).toHaveValue("1");
    expect(rowSelect("amounts.0.fromAccountId")).not.toBeDisabled();

    // choose "Bank" as the budget's from account (the filterable select
    // after "parent"; native selects share the combobox role, so query inputs)
    const fromAccount = container.querySelectorAll<HTMLInputElement>(
      'input[role="combobox"]'
    )[1];
    fireEvent.focus(fromAccount);
    fireEvent.change(fromAccount, { target: { value: "Bank" } });
    fireEvent.keyDown(fromAccount, { key: "Enter" });

    for (const name of ["amounts.0.fromAccountId", "overrides.0.accountId"]) {
      expect(rowSelect(name)).toHaveValue("2");
      expect(rowSelect(name)).toBeDisabled();
    }

    // rows added afterwards get it too
    fireEvent.click(addAmount);
    expect(rowSelect("amounts.0.fromAccountId")).toHaveValue("2");
    expect(rowSelect("amounts.1.fromAccountId")).toHaveValue("2");

    // and it is what gets saved for every row
    const name =
      container.querySelector<HTMLInputElement>('input[name="name"]')!;
    fireEvent.change(name, { target: { value: "Rent" } });
    fireEvent.blur(name);
    fireEvent.click(await screen.findByText("addOrEdit.add"));

    await waitFor(() =>
      expect(store.getState().data.userdata.budgets).toHaveLength(1)
    );
    const [saved] = store.getState().data.userdata.budgets;
    expect(saved.amounts.map((a) => a.fromAccountId)).toEqual([2, 2]);
    expect(saved.overrides.map((o) => o.accountId)).toEqual([2]);
  });

  it("can save a budget whose rows rely on the budget account", async () => {
    store.dispatch(
      SET_USERDATA({
        accounts: [account(1, "Cash"), account(2, "Bank")],
        budgets: [
          budget(17, {
            fromAccountId: 1,
            // stored without a row account
            amounts: [
              { expression: num(10), frequency: 1, startDate: "2026-01-01" },
            ],
            overrides: [{ month: "2026-02-01", expression: num(5) }],
          }),
        ],
      })
    );
    const { container } = renderBudget(17);

    await waitFor(() =>
      expect(screen.getByText("addOrEdit.edit")).toBeEnabled()
    );
    expect(screen.queryByText("errors.fromAccountEmpty")).toBeNull();
    // without a parent the budget account can be changed
    expect(fromAccountInput(container)).not.toBeDisabled();
  });

  it("locks a child budget to its parent's account", async () => {
    store.dispatch(
      SET_USERDATA({
        accounts: [account(1, "Cash"), account(2, "Bank")],
        budgets: [
          budget(1, { name: "Parent", fromAccountId: 2 }),
          budget(2, { name: "Child", parentId: 1, fromAccountId: 1 }),
        ],
      })
    );
    const { container } = renderBudget(2);

    await waitFor(() => expect(fromAccountInput(container)).toBeDisabled());
    expect(fromAccountInput(container)).toHaveValue("Bank");

    fireEvent.click(screen.getByText("addOrEdit.edit"));
    await waitFor(() =>
      expect(store.getState().data.userdata.budgets[1].fromAccountId).toBe(2)
    );
  });

  it("takes the account of a newly picked parent", async () => {
    store.dispatch(
      SET_USERDATA({
        accounts: [account(1, "Cash"), account(2, "Bank")],
        budgets: [
          budget(1, { name: "Parent", fromAccountId: 2 }),
          budget(3, { name: "Loose", fromAccountId: 1 }),
        ],
      })
    );
    const { container } = renderBudget(3);
    await waitFor(() =>
      expect(fromAccountInput(container)).toHaveValue("Cash")
    );
    expect(fromAccountInput(container)).not.toBeDisabled();

    const parent = comboboxes(container)[0];
    fireEvent.focus(parent);
    fireEvent.change(parent, { target: { value: "Parent" } });
    fireEvent.keyDown(parent, { key: "Enter" });

    await waitFor(() =>
      expect(fromAccountInput(container)).toHaveValue("Bank")
    );
    expect(fromAccountInput(container)).toBeDisabled();
  });

  it("hides ended amounts and past overrides until asked", async () => {
    const month = (offset: number) =>
      moment().add(offset, "month").startOf("month").format(DATE_FORMAT);
    store.dispatch(
      SET_USERDATA({
        accounts: [account(1, "Cash")],
        budgets: [
          budget(1, {
            fromAccountId: 1,
            amounts: [
              // still in effect, however old
              { expression: num(1), frequency: 1, startDate: month(-12) },
              // ended long ago
              {
                expression: num(2),
                frequency: 1,
                startDate: month(-24),
                endDate: month(-13),
              },
            ],
            overrides: [
              { month: month(-1), expression: num(3) },
              { month: month(-3), expression: num(4) },
            ],
          }),
        ],
      })
    );
    const { container } = renderBudget(1);
    const rows = (list: string) =>
      container.querySelectorAll(
        `input[name^="${list}."][name$=".expression.0.value"]`
      );

    await waitFor(() => expect(rows("amounts")).toHaveLength(1));
    expect(rows("overrides")).toHaveLength(1);

    // each list has its own link
    const [showAmounts, showOverrides] = screen.getAllByText(
      "addOrEdit.showOlder"
    );
    fireEvent.click(showAmounts);
    expect(rows("amounts")).toHaveLength(2);
    expect(rows("overrides")).toHaveLength(1);
    fireEvent.click(showOverrides);
    expect(rows("overrides")).toHaveLength(2);
  });

  it("doesn't save an amount that isn't a valid expression", async () => {
    store.dispatch(SET_USERDATA({ accounts: [account(1, "Cash")] }));
    const { container } = renderBudget(0);
    const [addAmount] = screen.getAllByText("+");
    fireEvent.click(addAmount);
    const row = container.querySelector<HTMLElement>(".list .sentence")!;
    const click = (name: string, role = "button") =>
      fireEvent.click(within(row).getByRole(role, { name }));
    const name =
      container.querySelector<HTMLInputElement>('input[name="name"]')!;
    fireEvent.change(name, { target: { value: "Food" } });
    fireEvent.blur(name);

    // "0 ×": a value is missing
    click("budget.expression.operator.*");
    expect(
      await within(row).findByText("errors.expressionInvalid")
    ).toBeInTheDocument();
    expect(screen.getByText("addOrEdit.add")).toBeDisabled();

    // "0 × ( days in month": the parenthesis isn't closed
    click("(");
    click("budget.expression.addValue");
    click("budget.expression.daysInMonth", "menuitem");
    expect(
      await within(row).findByText("errors.expressionParens")
    ).toBeInTheDocument();

    // "0 × ( days in month )"
    click(")");
    await waitFor(() =>
      expect(screen.getByText("addOrEdit.add")).toBeEnabled()
    );
  });

  it("saves an expression and only offers numbers for overrides", async () => {
    store.dispatch(SET_USERDATA({ accounts: [account(1, "Cash")] }));
    const { container } = renderBudget(0);
    const [addAmount, addOverride] = screen.getAllByText("+");
    fireEvent.click(addAmount);
    fireEvent.click(addOverride);
    const [amountRow, overrideRow] = container.querySelectorAll<HTMLElement>(
      ".list .sentence"
    );

    // 0 × 3, then changed to 12 − 3
    fireEvent.click(
      within(amountRow).getByRole("button", {
        name: "budget.expression.operator.*",
      })
    );
    fireEvent.click(
      within(amountRow).getByRole("button", {
        name: "budget.expression.addValue",
      })
    );
    fireEvent.click(
      within(amountRow).getByRole("menuitem", {
        name: "budget.expression.number",
      })
    );
    const value = (index: number) =>
      container.querySelector<HTMLInputElement>(
        `input[name="amounts.0.expression.${index}.value"]`
      )!;
    fireEvent.change(value(0), { target: { value: "12" } });
    fireEvent.change(value(2), { target: { value: "3" } });
    // the operation can be changed in place
    const operator = container.querySelector(
      'select[name="amounts.0.expression.1.operator"]'
    )!;
    fireEvent.change(operator, { target: { value: "-" } });

    // overrides add numbers directly, there is no other value to pick
    expect(
      within(overrideRow).queryByRole("button", {
        name: "budget.expression.addValue",
      })
    ).toBeNull();
    fireEvent.click(
      within(overrideRow).getByRole("button", {
        name: "budget.expression.operator.+",
      })
    );
    fireEvent.click(
      within(overrideRow).getByText("budget.expression.addNumber")
    );

    const name =
      container.querySelector<HTMLInputElement>('input[name="name"]')!;
    fireEvent.change(name, { target: { value: "Food" } });
    fireEvent.blur(name);
    fireEvent.click(await screen.findByText("addOrEdit.add"));

    await waitFor(() =>
      expect(store.getState().data.userdata.budgets).toHaveLength(1)
    );
    const [saved] = store.getState().data.userdata.budgets;
    expect(saved.amounts[0].expression).toEqual([
      { kind: "number", value: 12 },
      { kind: "operator", operator: "-" },
      { kind: "number", value: 3 },
    ]);
    expect(saved.overrides[0].expression).toEqual([
      { kind: "number", value: 0 },
      { kind: "operator", operator: "+" },
      { kind: "number", value: 0 },
    ]);
  });

  it("shows the formula a row had before expressions", async () => {
    store.dispatch(
      SET_USERDATA({
        accounts: [account(1, "Cash")],
        budgets: [
          budget(1, {
            fromAccountId: 1,
            amounts: [
              {
                amount: "cur_month.getDaysInMonth()",
                frequency: 1,
                startDate: "2026-01-01",
              },
            ],
          }),
        ],
      })
    );
    renderBudget(1);

    expect(
      await screen.findByText("budget.expression.legacy")
    ).toBeInTheDocument();
    // its expression has to be built before saving
    expect(screen.getByText("addOrEdit.edit")).toBeDisabled();
  });
});
