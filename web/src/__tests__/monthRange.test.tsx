import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "locales/i18n";
import { MonthRange } from "components/ui";
import { CELL_WIDTH } from "components/ui/MonthRange";
import FilterLayout from "components/Layouts/FilterLayout";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { store } from "store/store";

vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 11, 12) });
afterAll(() => {
  vi.useRealTimers();
});

const renderRange = (from = -1, to = 5) => {
  const onChange = vi.fn();
  const view = render(
    <MonthRange
      label="Months"
      from={from}
      to={to}
      min={-12}
      max={24}
      onChange={onChange}
    />
  );
  const [fromHandle, toHandle] = screen.getAllByRole("slider");
  const band = screen.getByRole("group");
  return { ...view, onChange, fromHandle, toHandle, band };
};

// pointer moves in whole months
const drag = (el: Element, months: number) => {
  fireEvent.pointerDown(el, { clientX: 100, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: 100 + months * CELL_WIDTH, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: 100 + months * CELL_WIDTH, pointerId: 1 });
};

describe("MonthRange", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  it("labels every month, the years and the selected range", () => {
    const { container } = renderRange();

    // -12..24 around June 2026
    expect(container.querySelectorAll(".month-cell")).toHaveLength(37);
    for (const year of ["2025", "2026", "2027", "2028"]) {
      expect(screen.getByText(year)).toBeInTheDocument();
    }
    expect(container.querySelector(".today .month")).toHaveTextContent("Jun");
    expect(container.querySelectorAll(".month-cell.selected")).toHaveLength(7);
    expect(screen.getByText("May 2026 – Nov 2026 · 7 months")).toBeInTheDocument();
  });

  it("moves an end or the whole range with the keyboard", () => {
    const { onChange, fromHandle, toHandle, band } = renderRange();

    fireEvent.keyDown(fromHandle, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(-2, 5);

    fireEvent.keyDown(toHandle, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(-1, -1);

    fireEvent.keyDown(band, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(0, 6);

    fireEvent.keyDown(band, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(18, 24);
  });

  it("drags the whole range, stopping at the timeline's end", () => {
    const { onChange, band, fromHandle } = renderRange();

    fireEvent.pointerDown(band, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(band, { clientX: 100 + 2 * CELL_WIDTH, pointerId: 1 });
    // shown while dragging, changed only when dropped
    expect(fromHandle).toHaveAttribute("aria-valuenow", "1");
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(band, { pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(1, 7);

    drag(band, 40);
    expect(onChange).toHaveBeenLastCalledWith(18, 24);
  });

  it("drags an end without crossing the other one", () => {
    const { onChange, fromHandle, toHandle } = renderRange();

    drag(toHandle, 3);
    expect(onChange).toHaveBeenLastCalledWith(-1, 8);

    drag(fromHandle, 20);
    expect(onChange).toHaveBeenLastCalledWith(5, 5);
  });

  it("moves the nearer end to a month clicked outside the range", () => {
    const { onChange, container } = renderRange();
    const cells = container.querySelectorAll(".month-cell");

    // cell 0 is 12 months back
    fireEvent.click(cells[12 - 3]);
    expect(onChange).toHaveBeenLastCalledWith(-3, 5);

    fireEvent.click(cells[12 + 9]);
    expect(onChange).toHaveBeenLastCalledWith(-1, 9);
  });

  it("collapses to the label and the summary", () => {
    const onToggle = vi.fn();
    const props = { label: "Months", from: -1, to: 5, onChange: vi.fn() };
    const { container, rerender } = render(
      <MonthRange {...props} collapsed onToggle={onToggle} />
    );

    expect(container.querySelector(".month-cell")).toBeNull();
    expect(screen.getByText("May 2026 – Nov 2026 · 7 months")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Months" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<MonthRange {...props} collapsed={false} onToggle={onToggle} />);
    expect(container.querySelector(".month-cell")).not.toBeNull();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});

describe("FilterLayout", () => {
  beforeAll(() => i18n.changeLanguage("en"));
  afterEach(() => localStorage.clear());

  const renderLayout = () =>
    render(
      <Provider store={store}>
        <MemoryRouter>
          <FilterLayout name="planning" />
        </MemoryRouter>
      </Provider>
    );

  it("keeps the range collapsed on this device only", () => {
    const { container, unmount } = renderLayout();
    expect(container.querySelector(".month-cell")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Months shown" }));
    expect(container.querySelector(".month-cell")).toBeNull();
    expect(localStorage.getItem("monthRangeCollapsed")).toBe("true");
    // not part of the user's settings
    expect(JSON.stringify(store.getState().data.userdata)).not.toContain(
      "ollapsed"
    );

    unmount();
    const again = renderLayout();
    expect(again.container.querySelector(".month-cell")).toBeNull();
  });
});
