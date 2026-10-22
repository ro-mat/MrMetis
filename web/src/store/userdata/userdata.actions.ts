import api from "../../helpers/apiConfiguration";
import { TAppThunk } from "store/store";
import {
  ERROR,
  FETCHING,
  SAVE_FAILED,
  SAVE_SUCCEEDED,
  SAVED,
  IMPORT_DATA,
  SET_LEFT_FROM_PREV_MONTH,
  SET_STORAGE,
  SET_USERDATA,
} from "./userdata.slice";
import { IStorageUsage, IUserdataDto } from "./userdata.types";
import { decrypt, encrypt } from "services/encryptor";
import { loadKey } from "services/keyStore";
import { loadLocalData, saveLocalData } from "services/localUsers";
import { logout } from "store/auth/auth.actions";
import { getDemoData, initDemoData, saveDemoData } from "helpers/demoHelper";
import { SET_ISDEMO } from "store/auth/auth.slice";
import { ADD_ERROR_TOAST, ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import i18n from "i18next";
import { Imported } from "helpers/importers";
import { ImportMode, prepareImport } from "helpers/importHelper";
import { recalculateClosedMonths } from "services/closedMonthsRecalculation";

interface IUserdataResponse {
  data: string | null;
  usage: IStorageUsage;
}

// Counted like the server does: the bytes of the encrypted data. There is no
// limit, so the browser's quota for the site stands in for it.
const localUsage = async (data: string | undefined): Promise<IStorageUsage> => {
  const usedBytes = new TextEncoder().encode(data ?? "").length;
  const limitBytes = await navigator.storage
    ?.estimate?.()
    .then((estimate) => estimate.quota)
    .catch(() => undefined);
  return { usedBytes, limitBytes };
};

// Demo data lives in localStorage, real data encrypted on the server or,
// for an on-device profile, in this browser's IndexedDB.
export const loadUserdata =
  (): TAppThunk =>
  async (dispatch, getState): Promise<void> => {
    const { isDemo, isLocal, user } = getState().auth;
    if (isDemo) {
      dispatch(SET_USERDATA(getDemoData()));
      return;
    }

    // e.g. the key was cleared in another tab: log in again rather than show empty data
    const key = await loadKey();
    if (!key) {
      dispatch(logout());
      return;
    }

    dispatch(FETCHING());
    if (isLocal) {
      try {
        const stored = await loadLocalData(user!);
        const data = await decrypt<IUserdataDto>(stored, key);
        dispatch(SET_STORAGE(await localUsage(stored)));
        dispatch(SET_USERDATA(data));
      } catch (err) {
        dispatch(ERROR(err as string));
      }
      return;
    }

    await api
      .get<IUserdataResponse>("/userdata")
      .then(async (res) => {
        const data = await decrypt<IUserdataDto>(res.data.data, key);
        dispatch(SET_STORAGE(res.data.usage));
        dispatch(SET_USERDATA(data));
      })
      .catch((err) => dispatch(ERROR(err)));
  };

export const saveUserData =
  (): TAppThunk =>
  async (dispatch, getState): Promise<void> => {
    // saving before the stored data was loaded would overwrite it with a partial copy
    if (!getState().data.loaded) {
      dispatch(SAVED());
      return;
    }

    const { accounts, budgets, statements, preferences, closedMonths } =
      getState().data.userdata;
    const data: IUserdataDto = {
      accounts,
      budgets,
      statements,
      preferences,
      closedMonths,
    };

    if (getState().auth.isDemo) {
      saveDemoData(data);
    } else {
      try {
        const key = await loadKey();
        if (!key) {
          throw new Error("No data key");
        }
        const encrypted = await encrypt(data, key);
        const { isLocal, user } = getState().auth;
        if (isLocal) {
          await saveLocalData(user!, encrypted);
          dispatch(SET_STORAGE(await localUsage(encrypted)));
        } else {
          const res = await api.post<IUserdataResponse>("/userdata", {
            data: encrypted,
          });
          dispatch(SET_STORAGE(res.data.usage));
        }

        // the user was told the previous save failed, so tell them this one worked
        if (getState().data.saveFailed) {
          dispatch(SAVE_SUCCEEDED());
          dispatch(ADD_SUCCESS_TOAST(i18n.t("storage.savedAfterFailure")));
        }
      } catch (err) {
        // the server refuses data over the limit; the changes stay in memory,
        // so the next change saves them again
        // the api rejects with the response; its ProblemDetails title is the error code
        const code = (err as { data?: { title?: string } } | undefined)?.data
          ?.title;
        if (code === "storageLimitExceeded") {
          dispatch(SAVE_FAILED());
          dispatch(ADD_ERROR_TOAST(i18n.t("errors.storageLimitExceeded")));
        } else if ((err as DOMException)?.name === "QuotaExceededError") {
          // the browser refuses to store more for this site
          dispatch(SAVE_FAILED());
          dispatch(ADD_ERROR_TOAST(i18n.t("errors.localStorageFull")));
        } else {
          dispatch(ERROR(err as string));
        }
      }
    }
    dispatch(SAVED());
  };

export const startDemo = (): TAppThunk => (dispatch) => {
  dispatch(SET_USERDATA(initDemoData()));
  dispatch(SET_ISDEMO(true));
};

// Adds what a file holds, or puts it in place of the current items (see
// prepareImport), and tells what happened.
// Imported statements also change what is left after the closed months from
// theirs on; when that can't be calculated (a broken formula) the stored left
// stays and a toast says so.
export const importData =
  (imported: Imported, mode: ImportMode = "add"): TAppThunk =>
  (dispatch, getState) => {
    const overwrite = mode === "overwrite";
    // overwriting, the removed statements' months change too
    const removedDates = overwrite
      ? getState().data.userdata.statements.map((s) => s.date)
      : [];
    const { prepared, skipped } = prepareImport(
      getState().data.userdata,
      imported,
      mode
    );
    dispatch(IMPORT_DATA({ ...prepared, overwrite }));
    dispatch(
      ADD_SUCCESS_TOAST(
        prepared.entity === "all"
          ? i18n.t("preferences.importedAll")
          : prepared.entity === "preferences"
            ? i18n.t("preferences.importedPreferences")
            : i18n.t("preferences.imported", { count: prepared.items.length })
      )
    );
    if (skipped) {
      dispatch(
        ADD_ERROR_TOAST(i18n.t("preferences.importSkipped", { count: skipped }))
      );
    }

    if (prepared.entity !== "statements") return;
    const first = [
      ...removedDates,
      ...prepared.items.map((s) => s.date),
    ].sort()[0];
    if (!first) return;
    try {
      const left = recalculateClosedMonths(getState().data.userdata, first);
      if (left) dispatch(SET_LEFT_FROM_PREV_MONTH(left));
    } catch {
      dispatch(
        ADD_ERROR_TOAST(i18n.t("preferences.importLeftNotRecalculated"))
      );
    }
  };
