import api from "../../helpers/apiConfiguration";
import { TAppThunk } from "store/store";
import {
  ERROR,
  FETCHING,
  SAVE_FAILED,
  SAVE_SUCCEEDED,
  SAVED,
  SET_STORAGE,
  SET_USERDATA,
} from "./userdata.slice";
import { IStorageUsage, IUserdataDto } from "./userdata.types";
import { decrypt, encrypt } from "services/encryptor";
import { loadKey } from "services/keyStore";
import { logout } from "store/auth/auth.actions";
import { getDemoData, initDemoData, saveDemoData } from "helpers/demoHelper";
import { SET_ISDEMO } from "store/auth/auth.slice";
import { ADD_ERROR_TOAST, ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import i18n from "i18next";

interface IUserdataResponse {
  data: string | null;
  usage: IStorageUsage;
}

// Demo data lives in localStorage, real data on the server (encrypted).
export const loadUserdata =
  (): TAppThunk =>
  async (dispatch, getState): Promise<void> => {
    if (getState().auth.isDemo) {
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

    const { accounts, budgets, statements } = getState().data.userdata;
    const data: IUserdataDto = { accounts, budgets, statements };

    if (getState().auth.isDemo) {
      saveDemoData(data);
    } else {
      try {
        const key = await loadKey();
        if (!key) {
          throw new Error("No data key");
        }
        const res = await api.post<IUserdataResponse>("/userdata", {
          data: await encrypt(data, key),
        });
        dispatch(SET_STORAGE(res.data.usage));

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
