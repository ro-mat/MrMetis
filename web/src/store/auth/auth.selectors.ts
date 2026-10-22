import { AppState } from "store/store";

// Logged in with a real account or an on-device profile.
export const selectIsAuthenticated = (state: AppState) =>
  (!!state.auth.token || state.auth.isLocal) && !!state.auth.user;

// Logged in (possibly still loading the user) or using demo data.
export const selectHasSession = (state: AppState) =>
  !!state.auth.token || state.auth.isDemo || state.auth.isLocal;

// Using an on-device profile: nothing goes to the server.
export const selectIsLocal = (state: AppState) => state.auth.isLocal;
