import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "store/store";
import { createFormatter } from "helpers/localeHelper";

// share of the limit from which the user is warned
export const STORAGE_WARNING_RATIO = 0.95;

export const selectStorage = (state: AppState) => state.data.storage;

// Stored data is close to (or at) the user's limit.
export const selectStorageWarning = (state: AppState) => {
  const storage = state.data.storage;
  return (
    !!storage && storage.usedBytes >= storage.limitBytes * STORAGE_WARNING_RATIO
  );
};

export const selectPreferences = (state: AppState) =>
  state.data.userdata.preferences;

// Formats and parses dates and amounts the way the user set up.
export const selectFormatter = createSelector(
  [selectPreferences],
  createFormatter
);
