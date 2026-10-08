import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expectOneStatement: false,
    amounts: [],
    overrides: [],
    ...props,
  }) as unknown as IBudget;

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
            amounts: [{ amount: "10", frequency: 1, startDate: "2026-01-01" }],
            overrides: [{ month: "2026-02-01", amount: 5 }],
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
              { amount: "1", frequency: 1, startDate: month(-12) },
              // ended long ago
              {
                amount: "2",
                frequency: 1,
                startDate: month(-24),
                endDate: month(-13),
              },
            ],
            overrides: [
              { month: month(-1), amount: 3 },
              { month: month(-3), amount: 4 },
            ],
          }),
        ],
      })
    );
    const { container } = renderBudget(1);
    const rows = (list: string) =>
      container.querySelectorAll(`input[name^="${list}."][name$=".amount"]`);

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
});
