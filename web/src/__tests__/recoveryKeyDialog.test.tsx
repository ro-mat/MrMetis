import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { SHOW_RECOVERY_KEY } from "store/auth/auth.slice";
import userdataReducer from "store/userdata/userdata.slice";
import uiReducer from "store/ui/ui.slice";
import RecoveryKeyDialog from "components/recovery/RecoveryKeyDialog";
import i18n from "locales/i18n";

const KEY = "AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4";

const setup = () => {
  const store = configureStore({
    reducer: { auth: authReducer, data: userdataReducer, ui: uiReducer },
  });
  render(
    <Provider store={store}>
      <RecoveryKeyDialog />
    </Provider>
  );
  return store;
};

describe("recovery key dialog", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  it("shows nothing without a key", () => {
    setup();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes only once the key is marked as saved", () => {
    const store = setup();
    act(() => {
      store.dispatch(SHOW_RECOVERY_KEY(KEY));
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("recovery-key").textContent).toBe(KEY);
    const done = screen.getByRole("button", {
      name: i18n.t("recoveryKey.done"),
    });
    expect((done as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(i18n.t("recoveryKey.saved")));
    expect((done as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(done);

    expect(store.getState().auth.shownRecoveryKey).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before skipping", () => {
    const store = setup();
    act(() => {
      store.dispatch(SHOW_RECOVERY_KEY(KEY));
    });
    const confirm = vi.spyOn(window, "confirm");
    const skip = screen.getByRole("button", {
      name: i18n.t("recoveryKey.skip"),
    });

    confirm.mockReturnValueOnce(false);
    fireEvent.click(skip);
    expect(store.getState().auth.shownRecoveryKey).toBe(KEY);

    confirm.mockReturnValueOnce(true);
    fireEvent.click(skip);
    expect(store.getState().auth.shownRecoveryKey).toBeNull();
    confirm.mockRestore();
  });
});
