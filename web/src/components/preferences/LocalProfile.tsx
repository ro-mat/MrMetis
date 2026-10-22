import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppState, TAppDispatch } from "store/store";
import { deleteLocalProfile } from "store/auth/auth.actions";
import {
  isStoragePersisted,
  requestPersistentStorage,
} from "services/persistentStorage";
import { Button } from "components/ui";

// The on-device profile: whether the browser may evict its data, and
// removing it with all its data from this browser.
const LocalProfile = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: AppState) => state.auth.user);
  // undefined: not known yet or not supported, then nothing is shown
  const [persisted, setPersisted] = useState<boolean>();
  const [declined, setDeclined] = useState(false);

  // checked again when the user comes back, e.g. from the browser's site
  // settings where the permission can be removed
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") {
        isStoragePersisted().then(setPersisted);
      }
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  const handleProtect = async () => {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    setDeclined(granted === false);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !window.confirm(t("preferences.deleteProfileConfirm", { name: user }))
    ) {
      return;
    }
    await dispatch(deleteLocalProfile());
    navigate("/");
  };

  return (
    // a form of its own: gets the form styles, never saves the preferences
    <form className="local-profile" onSubmit={handleDelete}>
      <h3>{t("preferences.localProfile")}</h3>
      <p>{t("preferences.localProfileText", { name: user })}</p>
      {persisted === true && (
        <p>
          <strong className="storage-status protected">
            {t("preferences.storageProtectedLabel")}:
          </strong>{" "}
          {t("preferences.storageProtected")}
        </p>
      )}
      {persisted === false && (
        <>
          <p>
            <strong className="storage-status not-protected">
              {t("preferences.storageNotProtectedLabel")}:
            </strong>{" "}
            {t("preferences.storageNotProtected")}
          </p>
          {declined && <p>{t("preferences.storageProtectDeclined")}</p>}
        </>
      )}
      <div className="crud">
        {persisted === false && (
          <Button type="button" onClick={handleProtect}>
            {t("preferences.protectStorage")}
          </Button>
        )}
        <Button type="submit">{t("preferences.deleteProfile")}</Button>
      </div>
    </form>
  );
};

export default LocalProfile;
