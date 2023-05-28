import api from "../../helpers/apiConfiguration";
import { clearKeys, hashPassword } from "services/encryptor";
import { TAppThunk } from "store/store";
import {
  AUTH_ERROR,
  AUTH_FETCHING,
  SET_ISDEMO,
  SET_TOKEN,
  SET_USER,
} from "./auth.slice";
import { ICredentials, IUser } from "./auth.types";
import { fetchUserdata, saveUserData } from "store/userdata/userdata.actions";
import { CLEAR_USERDATA } from "store/userdata/userdata.slice";
import { DemoDataKey } from "helpers/demoHelper";

export const login =
  (credentials: ICredentials): TAppThunk =>
  async (dispatch) => {
    dispatch(AUTH_FETCHING());

    dispatch(CLEAR_USERDATA());
    localStorage.removeItem(DemoDataKey);
    dispatch(SET_ISDEMO(false));

    const hashPass = await hashPassword(
      credentials.email,
      credentials.password
    );

    await api
      .post<IUser>("identity/login", {
        email: credentials.email,
        password: hashPass,
      })
      .then((res) => dispatch(attempt(res.data.token)))
      .then(() => dispatch(fetchUserdata()))
      .catch((err) => {
        dispatch(
          AUTH_ERROR(
            err?.data?.errors?.reduce(
              (prev: string, cur: string) => (prev ? `${prev}, ${cur}` : cur),
              ""
            )
          )
        );
      });
  };
export const register =
  (credentials: ICredentials): TAppThunk =>
  async (dispatch) => {
    dispatch(AUTH_FETCHING());

    localStorage.removeItem(DemoDataKey);
    dispatch(SET_ISDEMO(false));

    const hashPass = await hashPassword(
      credentials.email,
      credentials.password
    );
    await api
      .post<IUser>("identity/register", {
        email: credentials.email,
        password: hashPass,
        invitationCode: credentials.invitationCode,
      })
      .then((res) => dispatch(attempt(res.data.token)))
      .then(() => dispatch(fetchUserdata()))
      .catch((err) => {
        dispatch(
          AUTH_ERROR(
            err?.data?.errors?.reduce(
              (prev: string, cur: string) => (prev ? `${prev}, ${cur}` : cur),
              ""
            )
          )
        );
      });
  };
export const attempt =
  (token?: string | null): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(AUTH_FETCHING());
    if (token) {
      dispatch(SET_TOKEN(token));
    }

    await api
      .get<IUser>("identity/me")
      .then((res) => dispatch(SET_USER(res.data as string)))
      .catch((err) => {
        dispatch(
          AUTH_ERROR(
            err?.data?.errors?.reduce(
              (prev: string, cur: string) => (prev ? `${prev}, ${cur}` : cur),
              ""
            )
          )
        );
      });
  };
export const logout = (): TAppThunk => (dispatch) => {
  dispatch(AUTH_FETCHING());
  clearKeys();

  api
    .post("identity/logout")
    .then(() => {
      dispatch(SET_TOKEN(null));
      dispatch(SET_USER(null));
      dispatch(CLEAR_USERDATA());
    })
    .catch((err) => {
      dispatch(
        AUTH_ERROR(
          err?.data?.errors?.reduce(
            (prev: string, cur: string) => (prev ? `${prev}, ${cur}` : cur),
            ""
          )
        )
      );
    });
};
