import api from "../../helpers/apiConfiguration";
import { TAppThunk } from "store/store";
import {
  ADD_ACCOUNT,
  ADD_BUDGET,
  ADD_STATEMENT,
  DELETE_ACCOUNT,
  DELETE_BUDGET,
  DELETE_STATEMENT,
  ERROR,
  FETCHING,
  SAVED,
  SET_ACCOUNTS,
  SET_BUDGETS,
  SET_STATEMENTS,
  UPDATE_ACCOUNT,
  UPDATE_BUDGET,
  UPDATE_STATEMENT,
} from "./userdata.slice";
import { IAccount, IBudget, IStatement, IUserdataDto } from "./userdata.types";
import { decrypt, encrypt } from "services/encryptor";
import { saveDemoData } from "helpers/demoHelper";
import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";

export const fetchUserdata =
  (): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(FETCHING());

    await api
      .get<{ id: number; data: string }>("/userdata")
      .then((res) => decrypt<IUserdataDto>(res.data))
      .then((res) => {
        dispatch(SET_STATEMENTS(res.statements));
        dispatch(SET_BUDGETS(res.budgets));
        dispatch(SET_ACCOUNTS(res.accounts));
      })
      .catch((err) => dispatch(ERROR(err)));
  };

export const saveUserData =
  (): TAppThunk =>
  async (dispatch, getState): Promise<void> => {
    const userData = getState().data.userdata;
    const data: IUserdataDto = {
      accounts: userData.accounts,
      budgets: userData.budgets,
      statements: userData.statements,
    };

    if (getState().auth.isDemo) {
      saveDemoData(data);
      dispatch(SAVED());
      return;
    }
    try {
      await api.post("/userdata", { data: encrypt(data) });
    } catch (err) {
      dispatch(ERROR(err as string));
    }
    dispatch(SAVED());
  };

export const addStatement =
  (s: IStatement): TAppThunk =>
  async (dispatch): Promise<void> => {
    s.dateCreated = moment().format(DATE_FORMAT);
    dispatch(FETCHING());
    dispatch(ADD_STATEMENT(s));
  };

export const updateStatement =
  (s: IStatement): TAppThunk =>
  async (dispatch): Promise<void> => {
    s.dateModified = moment().format(DATE_FORMAT);
    dispatch(FETCHING());
    dispatch(UPDATE_STATEMENT(s));
  };
export const deleteStatement =
  (id: number): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(FETCHING());
    dispatch(DELETE_STATEMENT(id));
  };

export const addBudget =
  (b: IBudget): TAppThunk =>
  async (dispatch): Promise<void> => {
    b.dateCreated = moment().format(DATE_FORMAT);
    dispatch(FETCHING());
    dispatch(ADD_BUDGET(b));
  };

export const updateBudget =
  (b: IBudget): TAppThunk =>
  async (dispatch): Promise<void> => {
    b.dateModified = moment().format(DATE_FORMAT);
    dispatch(FETCHING());
    dispatch(UPDATE_BUDGET(b));
  };

export const deleteBudget =
  (id: number): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(FETCHING());
    dispatch(DELETE_BUDGET(id));
  };

export const addAccount =
  (a: IAccount): TAppThunk =>
  async (dispatch): Promise<void> => {
    a.dateCreated = moment().format(DATE_FORMAT);
    dispatch(FETCHING());
    dispatch(ADD_ACCOUNT(a));
  };

export const updateAccount =
  (a: IAccount): TAppThunk =>
  async (dispatch): Promise<void> => {
    a.dateModified = moment().format(DATE_FORMAT);
    dispatch(FETCHING());
    dispatch(UPDATE_ACCOUNT(a));
  };

export const deleteAccount =
  (id: number): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(FETCHING());
    dispatch(DELETE_ACCOUNT(id));
  };
