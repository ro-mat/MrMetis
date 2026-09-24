import api from "../../helpers/apiConfiguration";
import { TAppThunk } from "store/store";
import { ERROR, FETCHING, SAVED, SET_USERDATA } from "./userdata.slice";
import { IUserdataDto } from "./userdata.types";
import { decrypt, encrypt } from "services/encryptor";
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

    dispatch(FETCHING());
    await api
      .get<{ id: number; data: string }>("/userdata")
      .then((res) => decrypt<IUserdataDto>(res.data.data))
      .then((res) => dispatch(SET_USERDATA(res)))
      .catch((err) => dispatch(ERROR(err)));
  };

export const saveUserData =
  (): TAppThunk =>
  async (dispatch, getState): Promise<void> => {
    const { accounts, budgets, statements } = getState().data.userdata;
    const data: IUserdataDto = { accounts, budgets, statements };

    if (getState().auth.isDemo) {
      saveDemoData(data);
    } else {
      try {
        await api.post("/userdata", { data: encrypt(data) });
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
