import api from "../../helpers/apiConfiguration";
import { TAppThunk } from "store/store";
import { ERROR, FETCHING, SAVED, SET_USERDATA } from "./userdata.slice";
import { IUserdataDto } from "./userdata.types";
import { decrypt, encrypt } from "services/encryptor";
import { loadKey } from "services/keyStore";
import { logout } from "store/auth/auth.actions";
import { getDemoData, initDemoData, saveDemoData } from "helpers/demoHelper";
import { SET_ISDEMO } from "store/auth/auth.slice";

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
      .get<{ id: number; data: string }>("/userdata")
      .then((res) => decrypt<IUserdataDto>(res.data.data, key))
      .then((res) => dispatch(SET_USERDATA(res)))
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
        await api.post("/userdata", { data: await encrypt(data, key) });
      } catch (err) {
        dispatch(ERROR(err as string));
      }
    }
    dispatch(SAVED());
  };

export const startDemo = (): TAppThunk => (dispatch) => {
  dispatch(SET_USERDATA(initDemoData()));
  dispatch(SET_ISDEMO(true));
};
