import { configureStore, ThunkAction } from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
import { Action, combineReducers } from "redux";
import authReducer from "store/auth/auth.slice";
import userdataReducer from "store/userdata/userdata.slice";
import uiReducer from "store/ui/ui.slice";

enableMapSet();

const rootReducer = combineReducers({
  auth: authReducer,
  data: userdataReducer,
  ui: uiReducer,
});

export type AppState = ReturnType<typeof rootReducer>;
export type TAppDispatch = typeof store.dispatch;
export type TAppThunk = ThunkAction<void, AppState, undefined, Action<string>>;

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({ immutableCheck: false });
    return middleware;
  },
});

export interface IBaseState {
  err: string | null;
  isFetching: boolean;
}

export interface IBaseListState<T> extends IBaseState {
  list: T[];
}

export default store;
