import { createSlice } from "@reduxjs/toolkit";
import moment from "moment";
import { add, nextId, remove, update } from "helpers/userdata";
import { DATE_TIME_FORMAT } from "helpers/dateHelper";
import {
  IAccount,
  IBudget,
  IStatement,
  IUserdata,
  IUserdataDto,
  IUserdataState,
} from "./userdata.types";
import { IAction } from "types/IAction";
import { IHaveMetadata } from "types/IHaveMetadata";

const emptyUserdata = (): IUserdata => ({
  statements: [],
  budgets: [],
  accounts: [],
});

const initialState: IUserdataState = {
  err: null,
  isFetching: false,
  savePending: false,
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

    SET_USERDATA: (state, action: IAction<Partial<IUserdataDto>>) => {
      const { statements, budgets, accounts } = action.payload;
      state.userdata = {
        statements: statements ?? [],
        budgets: budgets ?? [],
        accounts: accounts ?? [],
      };
      state.isFetching = false;
    },
    CLEAR_USERDATA: (state) => {
      state.userdata = emptyUserdata();
      state.isFetching = false;
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
  SET_USERDATA,
  CLEAR_USERDATA,
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
