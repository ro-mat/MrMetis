import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "store/store";
import { SET_USERDATA } from "store/userdata/userdata.slice";
import StatementTable from "components/StatementTable";
import { IStatement } from "store/userdata/userdata.types";

const makeStatements = (count: number): IStatement[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    dateCreated: "2026-01-01",
    date: "2026-01-01",
    amount: i + 1,
    budgetId: 0,
    accountId: 0,
    comment: i % 2 ? "odd" : "even",
  }));

const renderTable = (
  statements: IStatement[],
  topRows?: number,
  showMoreRows?: number
) =>
  render(
    <Provider store={store}>
      <StatementTable
        statements={statements}
        topRows={topRows}
        showMoreRows={showMoreRows}
      />
    </Provider>
  );

const bodyRowCount = (container: HTMLElement) =>
  container.querySelectorAll("tbody tr").length;

describe("StatementTable", () => {
  beforeEach(() => {
    store.dispatch(SET_USERDATA({}));
  });

  it("shows all rows without topRows", () => {
    const { container } = renderTable(makeStatements(120));
    expect(bodyRowCount(container)).toBe(120);
    expect(screen.queryByText("statement.showMore")).toBeNull();
  });

  it("shows top rows and reveals topRows more per click by default", () => {
    const { container } = renderTable(makeStatements(120), 50);
    expect(bodyRowCount(container)).toBe(50);

    fireEvent.click(screen.getByText("statement.showMore"));
    expect(bodyRowCount(container)).toBe(100);

    fireEvent.click(screen.getByText("statement.showMore"));
    expect(bodyRowCount(container)).toBe(120);
    expect(screen.queryByText("statement.showMore")).toBeNull();
  });

  it("reveals showMoreRows per click when given", () => {
    const { container } = renderTable(makeStatements(120), 50, 20);
    fireEvent.click(screen.getByText("statement.showMore"));
    expect(bodyRowCount(container)).toBe(70);
  });

  it("shows all rows at once", () => {
    const { container } = renderTable(makeStatements(120), 50);
    fireEvent.click(screen.getByText("statement.showAll"));
    expect(bodyRowCount(container)).toBe(120);
    expect(screen.queryByText("statement.showAll")).toBeNull();
  });

  it("resets to top rows when the filter changes", () => {
    const { container } = renderTable(makeStatements(120), 50);
    fireEvent.click(screen.getByText("statement.showMore"));
    expect(bodyRowCount(container)).toBe(100);

    fireEvent.change(container.querySelector("input")!, {
      target: { value: "odd" },
    });
    expect(bodyRowCount(container)).toBe(50);

    fireEvent.click(screen.getByText("statement.showAll"));
    fireEvent.change(container.querySelector("input")!, {
      target: { value: "" },
    });
    expect(bodyRowCount(container)).toBe(50);
    expect(screen.getByText("statement.showMore")).toBeInTheDocument();
  });
});
