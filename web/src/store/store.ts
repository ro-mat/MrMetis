import {
  Action,
  combineReducers,
  configureStore,
  ThunkAction,
} from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ immutableCheck: false }),
});

export interface IBaseState {
  err: string | null;
  isFetching: boolean;
}

export default store;
