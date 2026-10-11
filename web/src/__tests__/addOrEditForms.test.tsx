import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "store/store";
import { SET_USERDATA } from "store/userdata/userdata.slice";
import AccountAddOrEdit from "components/account/AccountAddOrEdit";
import BudgetAddOrEdit from "components/budget/BudgetAddOrEdit";
import StatementAddOrEdit from "components/statement/StatementAddOrEdit";
import { IBudget } from "store/userdata/userdata.types";
import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";

const renderForm = (
  Form: React.ComponentType<{ id: number; onClose: () => void }>
) =>
  render(
    <Provider store={store}>
      <Form id={0} onClose={() => {}} />
    </Provider>
  );

describe("add/edit forms", () => {
  beforeEach(() => {
    store.dispatch(SET_USERDATA({}));
  });

  it.each([
    ["account", AccountAddOrEdit],
    ["budget", BudgetAddOrEdit],
    ["statement", StatementAddOrEdit],
  ])("%s form cannot be submitted while empty", async (_, Form) => {
    renderForm(Form);
    // validity is computed asynchronously, give it a moment
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText("addOrEdit.add")).toBeDisabled();
  });

  it("lists the validation errors on the disabled button", async () => {
    renderForm(AccountAddOrEdit);
    await new Promise((r) => setTimeout(r, 20));
    // shown even though the field wasn't touched yet
    expect(screen.getByText("errors.nameEmpty")).toBeInTheDocument();
  });

  it("enables the button once the form is valid", async () => {
    const { container } = renderForm(AccountAddOrEdit);
    const name = container.querySelector('input[name="name"]')!;

    fireEvent.change(name, { target: { value: "   " } });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText("addOrEdit.add")).toBeDisabled();

    fireEvent.change(name, { target: { value: "Cash" } });
    await waitFor(() =>
      expect(screen.getByText("addOrEdit.add")).toBeEnabled()
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("explains why an account in use cannot be deleted", () => {
    store.dispatch(
      SET_USERDATA({
        accounts: [
          {
            id: 1,
            name: "Cash",
            dateCreated: "2026-01-01",
            leftFromPrevMonth: [],
          },
        ],
        budgets: [{ id: 1, fromAccountId: 1 } as IBudget],
      })
    );
    render(
      <Provider store={store}>
        <AccountAddOrEdit id={1} onClose={() => {}} />
      </Provider>
    );

    expect(screen.getByText("addOrEdit.delete")).toBeDisabled();
    expect(screen.getByText("addOrEdit.accountInUse")).toBeInTheDocument();
    expect(screen.queryByText("?")).toBeNull();
  });

  it("hides account rows older than the previous month until asked", async () => {
    const month = (offset: number) =>
      moment().add(offset, "month").startOf("month").format(DATE_FORMAT);
    store.dispatch(
      SET_USERDATA({
        accounts: [
          {
            id: 1,
            name: "Cash",
            dateCreated: "2026-01-01",
            leftFromPrevMonth: [
              // stored out of order
              { month: month(-1), amount: 20, accountId: 1 },
              { month: month(-2), amount: 30, accountId: 1 },
              { month: month(0), amount: 10, accountId: 1 },
            ],
          },
        ],
      })
    );
    const { container } = render(
      <Provider store={store}>
        <AccountAddOrEdit id={1} onClose={() => {}} />
      </Provider>
    );
    const rows = () =>
      container.querySelectorAll(
        'input[name^="leftFromPrevMonth."][name$=".amount"]'
      );

    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(screen.getByText("addOrEdit.showOlder"));
    // latest month at the top
    expect([...rows()].map((r) => (r as HTMLInputElement).value)).toEqual([
      "10",
      "20",
      "30",
    ]);
    fireEvent.click(screen.getByText("addOrEdit.hideOlder"));
    expect(rows()).toHaveLength(2);

    // hidden rows are still saved
    fireEvent.click(screen.getByText("addOrEdit.edit"));
    await waitFor(() =>
      expect(
        store.getState().data.userdata.accounts[0].leftFromPrevMonth
      ).toHaveLength(3)
    );
    expect(
      store
        .getState()
        .data.userdata.accounts[0].leftFromPrevMonth.map((l) => l.amount)
    ).toEqual(expect.arrayContaining([10, 20, 30]));
  });
});
