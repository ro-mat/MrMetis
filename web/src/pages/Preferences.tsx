import React from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { PageHeader } from "components/ui";
import PreferencesForm from "components/preferences/PreferencesForm";
import DataExport from "components/preferences/DataExport";
import DataImport from "components/preferences/DataImport";
import LocalProfile from "components/preferences/LocalProfile";
import ChangePassword from "components/preferences/ChangePassword";
import {
  selectIsAuthenticated,
  selectIsLocal,
} from "store/auth/auth.selectors";

// The form waits for the stored preferences, so it doesn't show the defaults
// (e.g. the browser's country) first.
const Preferences = () => {
  const loaded = useSelector((state: AppState) => state.data.loaded);
  const isLocal = useSelector(selectIsLocal);
  // not in the demo, it has no password
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <div className="preferences">
      <PageHeader title="preferences.header" />
      {loaded && (
        <PreferencesForm>
          <DataExport />
          <DataImport />
          {isAuthenticated && <ChangePassword />}
          {isLocal && <LocalProfile />}
        </PreferencesForm>
      )}
    </div>
  );
};

export default Preferences;
