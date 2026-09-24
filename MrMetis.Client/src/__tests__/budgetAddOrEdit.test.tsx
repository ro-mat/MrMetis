import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "store/store";
import { SET_USERDATA } from "store/userdata/userdata.slice";
import BudgetAddOrEdit from "components/budget/BudgetAddOrEdit";

const account = (id: number, name: string) => ({
  id,
  name,
  dateCreated: "2026-01-01",
  leftFromPrevMonth: [],
});

describe("BudgetAddOrEdit", () => {
  it("forces the budget account on existing and new amount/override rows", async () => {
    store.dispatch(
      SET_USERDATA({ accounts: [account(1, "Cash"), account(2, "Bank")] })
    );
    const { container } = render(
      <Provider store={store}>
        <BudgetAddOrEdit />
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
});
