import { createSlice } from "@reduxjs/toolkit";
import { add, remove, update } from "helpers/userdata";
import {
  IAccount,
  IBudget,
  IStatement,
  IUserdataState,
} from "./userdata.types";
import { IAction } from "types/IAction";

const initialState: IUserdataState = {
  err: null,
  isFetching: false,
  savePending: false,
  userdata: {
    statements: [],
    budgets: [],
    accounts: [],
  },
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

    CLEAR_USERDATA: (state) => {
      state.userdata = {
        statements: [],
        budgets: [],
        accounts: [],
      };
      state.isFetching = false;
    },

    SET_STATEMENTS: (state, action: IAction<IStatement[] | undefined>) => {
      state.userdata.statements = action.payload ?? [];
      state.isFetching = false;
    },
    ADD_STATEMENT: (state, action: IAction<IStatement>) => {
      add(state.userdata.statements, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },
    UPDATE_STATEMENT: (state, action: IAction<IStatement>) => {
      update(state.userdata.statements, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },
    DELETE_STATEMENT: (state, action: IAction<number>) => {
      remove(state.userdata.statements, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },

    SET_BUDGETS: (state, action: IAction<IBudget[] | undefined>) => {
      state.userdata.budgets = action.payload ?? [];
      state.isFetching = false;
    },
    ADD_BUDGET: (state, action: IAction<IBudget>) => {
      add(state.userdata.budgets, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },
    UPDATE_BUDGET: (state, action: IAction<IBudget>) => {
      update(state.userdata.budgets, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },
    DELETE_BUDGET: (state, action: IAction<number>) => {
      remove(state.userdata.budgets, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },

    SET_ACCOUNTS: (state, action: IAction<IAccount[] | undefined>) => {
      state.userdata.accounts = action.payload ?? [];
      state.isFetching = false;
    },
    ADD_ACCOUNT: (state, action: IAction<IAccount>) => {
      add(state.userdata.accounts, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },
    UPDATE_ACCOUNT: (state, action: IAction<IAccount>) => {
      update(state.userdata.accounts, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },
    DELETE_ACCOUNT: (state, action: IAction<number>) => {
      remove(state.userdata.accounts, action.payload);
      state.isFetching = false;
      state.savePending = true;
    },
  },
});

export const {
  FETCHING,
  ERROR,
  SAVE_CHANGES,
  SAVED,
  CLEAR_USERDATA,
  SET_STATEMENTS,
  ADD_STATEMENT,
  UPDATE_STATEMENT,
  DELETE_STATEMENT,
  SET_BUDGETS,
  ADD_BUDGET,
  UPDATE_BUDGET,
  DELETE_BUDGET,
  SET_ACCOUNTS,
  ADD_ACCOUNT,
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT,
} = userdataSlice.actions;

export default userdataSlice.reducer;
