import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import useEditRoute from "hooks/useEditRoute";

const Page = () => {
  const { selectedId, openNew, openEdit, close } = useEditRoute("/budget");
  const { pathname } = useLocation();
  return (
    <>
      <span data-testid="id">{String(selectedId)}</span>
      <span data-testid="path">{pathname}</span>
      <button onClick={openNew}>new</button>
      <button onClick={() => openEdit(7)}>edit</button>
      <button onClick={close}>close</button>
    </>
  );
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/budget/:id?" element={<Page />} />
      </Routes>
    </MemoryRouter>,
  );

const id = () => screen.getByTestId("id").textContent;
const path = () => screen.getByTestId("path").textContent;

describe("useEditRoute", () => {
  it.each([
    ["/budget", "undefined"],
    ["/budget/new", "0"],
    ["/budget/42", "42"],
  ])("%s selects %s", (url, expected) => {
    renderAt(url);
    expect(id()).toBe(expected);
  });

  it("redirects an invalid id to the list", () => {
    renderAt("/budget/abc");
    expect(path()).toBe("/budget");
    expect(id()).toBe("undefined");
  });

  it("navigates between new, edit and closed", () => {
    renderAt("/budget");
    fireEvent.click(screen.getByText("new"));
    expect(path()).toBe("/budget/new");
    fireEvent.click(screen.getByText("edit"));
    expect(path()).toBe("/budget/7");
    fireEvent.click(screen.getByText("close"));
    expect(path()).toBe("/budget");
  });
});
