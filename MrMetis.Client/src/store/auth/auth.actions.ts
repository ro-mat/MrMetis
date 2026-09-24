import api from "../../helpers/apiConfiguration";
import { clearKeys, hashPassword } from "services/encryptor";
import { TAppDispatch, TAppThunk } from "store/store";
import {
  AUTH_ERROR,
  AUTH_FETCHING,
  SET_ISDEMO,
  SET_TOKEN,
  SET_USER,
} from "./auth.slice";
import { ICredentials, IUser } from "./auth.types";
import { CLEAR_USERDATA } from "store/userdata/userdata.slice";
import { clearDemoData } from "helpers/demoHelper";

const authError = (err: any) => AUTH_ERROR(err?.data?.errors?.join(", "));

// Shared by login and register. Userdata is loaded by App once the user is set.
const authenticate = async (
  dispatch: TAppDispatch,
  url: string,
  { email, password, invitationCode }: ICredentials
) => {
  dispatch(AUTH_FETCHING());
  dispatch(CLEAR_USERDATA());
  clearDemoData();
  dispatch(SET_ISDEMO(false));

  const hashPass = await hashPassword(email, password);

  await api
    .post<IUser>(url, { email, password: hashPass, invitationCode })
    .then((res) => dispatch(attempt(res.data.token)))
    .catch((err) => dispatch(authError(err)));
};

export const login =
  (credentials: ICredentials): TAppThunk =>
  (dispatch) =>
    authenticate(dispatch, "identity/login", credentials);

export const register =
  (credentials: ICredentials): TAppThunk =>
  (dispatch) =>
    authenticate(dispatch, "identity/register", credentials);

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
      .catch((err) => dispatch(authError(err)));
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
    .catch((err) => dispatch(authError(err)));
};
