import React from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { PageHeader } from "components/ui";
import PreferencesForm from "components/preferences/PreferencesForm";
import DataExport from "components/preferences/DataExport";
import DataImport from "components/preferences/DataImport";
import LocalProfile from "components/preferences/LocalProfile";
import { selectIsLocal } from "store/auth/auth.selectors";

// The form waits for the stored preferences, so it doesn't show the defaults
// (e.g. the browser's country) first.
const Preferences = () => {
  const loaded = useSelector((state: AppState) => state.data.loaded);
  const isLocal = useSelector(selectIsLocal);

  return (
    <div className="preferences">
      <PageHeader title="preferences.header" />
      {loaded && (
        <PreferencesForm>
          <DataExport />
          <DataImport />
          {isLocal && <LocalProfile />}
        </PreferencesForm>
      )}
    </div>
  );
};

export default Preferences;
