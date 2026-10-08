import { AppState } from "store/store";

// Logged in with a real account.
export const selectIsAuthenticated = (state: AppState) =>
  !!state.auth.token && !!state.auth.user;

// Logged in (possibly still loading the user) or using demo data.
export const selectHasSession = (state: AppState) =>
  !!state.auth.token || state.auth.isDemo;
