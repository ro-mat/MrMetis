import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { store } from "store/store";
import { SET_USERDATA } from "store/userdata/userdata.slice";
import BudgetPage from "pages/BudgetPage";
import { BudgetTypeUser, IBudget } from "store/userdata/userdata.types";

const budget = (id: number, amount: string): IBudget => ({
  id,
  name: `Budget ${id}`,
  fromAccountId: 1,
  toAccountId: 0,
  isEssential: false,
  amounts: [
    { amount, fromAccountId: 1, frequency: 1, startDate: "2020-01-01" },
  ],
  overrides: [],
  type: BudgetTypeUser.spending,
  expectOneStatement: false,
  dateCreated: "2020-01-01",
});

describe("BudgetPage", () => {
  it("links the budgets that can't be calculated to their edit form", () => {
    store.dispatch(
      SET_USERDATA({
        accounts: [
          {
            id: 1,
            name: "Cash",
            dateCreated: "2020-01-01",
            leftFromPrevMonth: [],
          },
        ],
        // the formula can never be calculated
        budgets: [budget(1, "10"), budget(2, "unknownVariable + 1")],
      })
    );

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/budget"]}>
          <Routes>
            <Route path="/budget/:id?" element={<BudgetPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText("errors.calculation")).toBeInTheDocument();
    // the list is still there
    expect(screen.getByRole("cell", { name: "Budget 1" })).toBeInTheDocument();

    // only the broken budget is linked, and the link opens it for editing
    const link = screen.getByRole("link", { name: "Budget 2" });
    expect(screen.queryByRole("link", { name: "Budget 1" })).toBeNull();
    fireEvent.click(link);
    expect(screen.getByDisplayValue("unknownVariable + 1")).toBeInTheDocument();
  });
});
