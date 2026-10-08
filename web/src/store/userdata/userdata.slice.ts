import { createSlice } from "@reduxjs/toolkit";
import moment from "moment";
import { add, nextId, remove, update } from "helpers/userdata";
import { DATE_TIME_FORMAT } from "helpers/dateHelper";
import { defaultPreferences, withDefaults } from "helpers/localeHelper";
import {
  IAccount,
  IBudget,
  IPreferences,
  IStatement,
  IUserdata,
  IUserdataDto,
  IUserdataState,
  IStorageUsage,
} from "./userdata.types";
import { IAction } from "types/IAction";
import { IHaveMetadata } from "types/IHaveMetadata";

const emptyUserdata = (): IUserdata => ({
  statements: [],
  budgets: [],
  accounts: [],
  preferences: defaultPreferences(),
});

const initialState: IUserdataState = {
  err: null,
  isFetching: false,
  savePending: false,
  loaded: false,
  saveFailed: false,
  userdata: emptyUserdata(),
};

const now = () => moment().format(DATE_TIME_FORMAT);

// Every add/update/delete marks the data as changed so App saves it.
const addItem = <T extends IHaveMetadata>(
  state: IUserdataState,
  list: T[],
  item: T
) => {
  add(list, { ...item, id: nextId(list), dateCreated: now() });
  state.savePending = true;
};

const updateItem = <T extends IHaveMetadata>(
  state: IUserdataState,
  list: T[],
  item: T
) => {
  update(list, { ...item, dateModified: now() });
  state.savePending = true;
};

const removeItem = (
  state: IUserdataState,
  list: IHaveMetadata[],
  id: number
) => {
  remove(list, id);
  state.savePending = true;
};

const userdataSlice = createSlice({
  initialState,
  name: "userdata",
  reducers: {
    FETCHING: (state) => {
      state.isFetching = true;
    },
    ERROR: (state, action: IAction<string | null>) => {
      state.err = action.payload;
      state.isFetching = false;
    },
    SAVE_CHANGES: (state) => {
      state.savePending = true;
    },
    SAVED: (state) => {
      state.savePending = false;
    },
    SAVE_FAILED: (state) => {
      state.saveFailed = true;
    },
    SAVE_SUCCEEDED: (state) => {
      state.saveFailed = false;
    },
    SET_STORAGE: (state, action: IAction<IStorageUsage>) => {
      state.storage = action.payload;
    },

    SET_USERDATA: (state, action: IAction<Partial<IUserdataDto>>) => {
      const { statements, budgets, accounts, preferences } = action.payload;
      state.userdata = {
        statements: statements ?? [],
        budgets: budgets ?? [],
        accounts: accounts ?? [],
        preferences: withDefaults(preferences),
      };
      state.loaded = true;
      state.isFetching = false;
    },
    CLEAR_USERDATA: (state) => {
      state.userdata = emptyUserdata();
      state.loaded = false;
      state.storage = undefined;
      state.saveFailed = false;
      state.isFetching = false;
    },

    UPDATE_PREFERENCES: (state, action: IAction<Partial<IPreferences>>) => {
      state.userdata.preferences = {
        ...state.userdata.preferences,
        ...action.payload,
      };
      state.savePending = true;
    },

    ADD_STATEMENT: (state, action: IAction<IStatement>) =>
      addItem(state, state.userdata.statements, action.payload),
    UPDATE_STATEMENT: (state, action: IAction<IStatement>) =>
      updateItem(state, state.userdata.statements, action.payload),
    DELETE_STATEMENT: (state, action: IAction<number>) =>
      removeItem(state, state.userdata.statements, action.payload),

    ADD_BUDGET: (state, action: IAction<IBudget>) =>
      addItem(state, state.userdata.budgets, action.payload),
    UPDATE_BUDGET: (state, action: IAction<IBudget>) =>
      updateItem(state, state.userdata.budgets, action.payload),
    DELETE_BUDGET: (state, action: IAction<number>) =>
      removeItem(state, state.userdata.budgets, action.payload),

    ADD_ACCOUNT: (state, action: IAction<IAccount>) =>
      addItem(state, state.userdata.accounts, action.payload),
    UPDATE_ACCOUNT: (state, action: IAction<IAccount>) =>
      updateItem(state, state.userdata.accounts, action.payload),
    DELETE_ACCOUNT: (state, action: IAction<number>) =>
      removeItem(state, state.userdata.accounts, action.payload),
  },
});

export const {
  FETCHING,
  ERROR,
  SAVE_CHANGES,
  SAVED,
  SAVE_FAILED,
  SAVE_SUCCEEDED,
  SET_STORAGE,
  SET_USERDATA,
  CLEAR_USERDATA,
  UPDATE_PREFERENCES,
  ADD_STATEMENT,
  UPDATE_STATEMENT,
  DELETE_STATEMENT,
  ADD_BUDGET,
  UPDATE_BUDGET,
  DELETE_BUDGET,
  ADD_ACCOUNT,
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT,
} = userdataSlice.actions;

export default userdataSlice.reducer;
