import { createSlice } from "@reduxjs/toolkit";
import { IAuthState } from "./auth.types";
import { DemoDataKey } from "helpers/demoHelper";
import { IAction } from "types/IAction";

const initialState: IAuthState = {
  err: null,
  isFetching: false,

  token: localStorage.getItem("token"),
  user: null,
  isDemo: !!localStorage.getItem(DemoDataKey),
};

const authSlice = createSlice({
  initialState,
  name: "auth",
  reducers: {
    AUTH_FETCHING: (state) => {
      state.err = null;
      state.isFetching = true;
    },
    AUTH_ERROR: (state, action: IAction<string | null>) => {
      state.err = action.payload;
      state.isFetching = false;
    },
    SET_TOKEN: (state, action: IAction<string | null | undefined>) => {
      state.isFetching = false;
      state.err = null;

      state.token = action.payload;

      if (state.token) {
        localStorage.setItem("token", state.token);
      } else {
        localStorage.removeItem("token");
      }
    },
    SET_USER: (state, action: IAction<string | null | undefined>) => {
      state.isFetching = false;
      state.err = null;

      state.user = action.payload;
    },
    SET_ISDEMO: (state, action: IAction<boolean>) => {
      state.isDemo = action.payload;
    },
  },
});

export const { AUTH_FETCHING, AUTH_ERROR, SET_TOKEN, SET_USER, SET_ISDEMO } =
  authSlice.actions;

export default authSlice.reducer;
