import { createSlice } from "@reduxjs/toolkit";
import { IFilter, IUiState } from "./ui.types";
import { IAction } from "types/IAction";

const initialState: IUiState = {
  err: null,
  isFetching: false,
  ui: {
    filter: {
      fromRelativeMonth: -1,
      toRelativeMonth: 5,
    },
    previewStatements: {},
  },
  messages: [],
};

const uiSlice = createSlice({
  initialState,
  name: "ui",
  reducers: {
    FETCHING: (state) => {
      state.isFetching = true;
    },
    ERROR: (state, action: IAction<string | null>) => {
      state.err = action.payload;
      state.isFetching = false;
    },

    SET_FILTER: (state, action: IAction<IFilter>) => {
      state.ui.filter = action.payload;
      localStorage.setItem("ui", JSON.stringify(state.ui));

      state.isFetching = false;
    },
    SET_SELECTED_STATEMENT: (state, action: IAction<number | undefined>) => {
      state.ui.selectedStatementId = action.payload;
    },
    SET_SELECTED_BUDGET: (state, action: IAction<number | undefined>) => {
      state.ui.selectedBudgetId = action.payload;
    },
    SET_SELECTED_ACCOUNT: (state, action: IAction<number | undefined>) => {
      state.ui.selectedAccountId = action.payload;
    },
    SET_PREVIEW_STATEMENTS: (state, action: IAction<string | undefined>) => {
      state.ui.previewStatements.selectedPreviewStatements = action.payload;
    },

    ADD_SUCCESS_TOAST: (state, action: IAction<string>) => {
      state.messages.push({
        appearance: "success",
        message: action.payload,
      });
    },
    ADD_ERROR_TOAST: (state, action: IAction<string>) => {
      state.messages.push({
        appearance: "error",
        message: action.payload,
      });
    },
    CLEAR_TOAST_MESSAGES: (state) => {
      state.messages = [];
    },
  },
});

export const {
  FETCHING,
  ERROR,
  SET_FILTER,
  SET_SELECTED_STATEMENT,
  SET_SELECTED_BUDGET,
  SET_SELECTED_ACCOUNT,
  SET_PREVIEW_STATEMENTS,
  ADD_SUCCESS_TOAST,
  ADD_ERROR_TOAST,
  CLEAR_TOAST_MESSAGES,
} = uiSlice.actions;

export default uiSlice.reducer;
