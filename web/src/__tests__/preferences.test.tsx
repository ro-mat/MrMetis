import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "store/store";
import { CLEAR_USERDATA, SET_USERDATA } from "store/userdata/userdata.slice";
import { defaultPreferences } from "helpers/localeHelper";
import Preferences from "pages/Preferences";
import Header from "components/Header";
import "locales/i18n";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { APP_CODE } from "helpers/exportHelper";

const country = () => store.getState().data.userdata.preferences.locale.country;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("preferences page", () => {
  beforeEach(() => {
    store.dispatch(CLEAR_USERDATA());
  });

  it("shows the stored preferences once loaded and keeps them", async () => {
    // a refresh: the page shows the defaults until the stored data arrives
    render(
      <Provider store={store}>
        <Preferences />
      </Provider>
    );
    // nothing to show until the stored preferences are there
    expect(document.querySelector("form")).toBeNull();

    const defaults = defaultPreferences();
    const stored = defaults.locale.country === "DE" ? "FR" : "DE";
    store.dispatch(
      SET_USERDATA({
        preferences: {
          ...defaults,
          locale: { country: stored },
          idleTimeoutMinutes: 30,
        },
      })
    );
    await waitFor(() =>
      expect(
        document.querySelector<HTMLSelectElement>(
          'select[name="idleTimeoutMinutes"]'
        )?.value
      ).toBe("30")
    );

    // longer than the save delay, twice
    await wait(1000);
    expect(country()).toBe(stored);
    expect(store.getState().data.savePending).toBe(false);
  });

  it("saves what the user changes", async () => {
    store.dispatch(SET_USERDATA({}));
    render(
      <Provider store={store}>
        <Preferences />
      </Provider>
    );

    const timeout = document.querySelector<HTMLSelectElement>(
      'select[name="idleTimeoutMinutes"]'
    )!;
    fireEvent.change(timeout, { target: { value: "30" } });

    await waitFor(() =>
      expect(store.getState().data.userdata.preferences.idleTimeoutMinutes).toBe(30)
    );

    const theme = document.querySelector<HTMLSelectElement>(
      'select[name="theme"]'
    )!;
    expect(theme.value).toBe("auto");
    fireEvent.change(theme, { target: { value: "dark" } });
    await waitFor(() =>
      expect(store.getState().data.userdata.preferences.theme).toBe("dark")
    );
  });

  it("the language selection in the header follows the preference", async () => {
    store.dispatch(SET_USERDATA({}));
    expect(
      store.getState().data.userdata.preferences.showLanguageInHeader
    ).toBe(true);
    const { container } = render(
      <Provider store={store}>
        <MemoryRouter>
          <Header />
          <Preferences />
        </MemoryRouter>
      </Provider>
    );
    expect(container.querySelector(".lang-select")).not.toBeNull();

    const checkbox = container.querySelector<HTMLInputElement>(
      'input[name="showLanguageInHeader"]'
    )!;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);

    await waitFor(() =>
      expect(container.querySelector(".lang-select")).toBeNull()
    );
    expect(
      store.getState().data.userdata.preferences.showLanguageInHeader
    ).toBe(false);
  });

  it("exports the chosen data without changing the preferences", async () => {
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
      })
    );
    const prefs = store.getState().data.userdata.preferences;
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return "blob:export";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toMatch(/^mrmetis-accounts-.*\.json$/);
      });

    render(
      <Provider store={store}>
        <Preferences />
      </Provider>
    );
    fireEvent.change(document.querySelector('select[name="entity"]')!, {
      target: { value: "accounts" },
    });
    fireEvent.change(document.querySelector('select[name="format"]')!, {
      target: { value: "json" },
    });
    fireEvent.click(screen.getByText("Export"));

    // the form validates before exporting
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    const json = JSON.parse(await blob!.text());
    expect(json.app).toBe(APP_CODE);
    expect(json.items).toEqual([
      expect.objectContaining({ id: 1, name: "Cash" }),
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");

    // longer than the save delay
    await wait(600);
    expect(store.getState().data.userdata.preferences).toBe(prefs);
    click.mockRestore();
  });
});
