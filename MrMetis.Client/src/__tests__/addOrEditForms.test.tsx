import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "store/store";
import { SET_USERDATA } from "store/userdata/userdata.slice";
import AccountAddOrEdit from "components/account/AccountAddOrEdit";
import BudgetAddOrEdit from "components/budget/BudgetAddOrEdit";
import StatementAddOrEdit from "components/statement/StatementAddOrEdit";

const renderForm = (Form: React.ComponentType) =>
  render(
    <Provider store={store}>
      <Form />
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
  });
});
