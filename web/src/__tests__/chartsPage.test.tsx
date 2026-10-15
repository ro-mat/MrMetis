import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { store } from "store/store";
import { SET_USERDATA } from "store/userdata/userdata.slice";
import ChartsPage from "pages/ChartsPage";
import { BudgetTypeUser } from "store/userdata/userdata.types";

// jsdom has no layout, the charts only need to mount
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const renderPage = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ChartsPage />
      </MemoryRouter>
    </Provider>,
  );

describe("ChartsPage", () => {
  it("shows the charts and an account filter", () => {
    store.dispatch(
      SET_USERDATA({
        accounts: [1, 2].map((id) => ({
          id,
          name: `Account ${id}`,
          dateCreated: "2020-01-01",
          leftFromPrevMonth: [],
        })),
        budgets: [
          {
            id: 1,
            name: "Food",
            toAccountId: 0,
            isEssential: true,
            amounts: [
              {
                expression: [{ kind: "number", value: 100 }],
                fromAccountId: 1,
                frequency: 1,
                startDate: "2020-01-01",
              },
            ],
            overrides: [],
            type: BudgetTypeUser.spending,
            closeAfterOneStatement: false,
            dateCreated: "2020-01-01",
          },
        ],
      }),
    );
    renderPage();

    for (const title of [
      "charts.balance",
      "charts.incomeOutgoings",
      "charts.budgetComparison",
      "charts.spendingBreakdown",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("charts.allAccounts")).toBeInTheDocument();
    expect(screen.getByText("Account 2")).toBeInTheDocument();
  });

  it("asks for data first when there are no budgets", () => {
    store.dispatch(SET_USERDATA({ accounts: [], budgets: [] }));
    renderPage();

    expect(screen.queryByText("charts.balance")).toBeNull();
  });
});
