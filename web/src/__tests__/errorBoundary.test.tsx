import React from "react";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "components/ErrorBoundary";

const Boom = (): React.JSX.Element => {
  throw new Error("calc failed");
};

describe("ErrorBoundary", () => {
  it("clears the error when resetKey changes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary resetKey="/planning">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("calc failed")).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/budget">
        <div>budget page</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("budget page")).toBeInTheDocument();
  });
});
