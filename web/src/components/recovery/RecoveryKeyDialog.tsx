import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AppState, TAppDispatch } from "store/store";
import { SHOW_RECOVERY_KEY } from "store/auth/auth.slice";
import { ADD_ERROR_TOAST, ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import { downloadFile } from "helpers/exportHelper";
import { Button, CtaButton } from "components/ui";
import "styles/recovery.scss";

// Shows a new recovery key once, until the user says it is saved. It is
// never stored, so leaving the page loses it; a new one can be made in
// Preferences.
const RecoveryKeyDialog = () => {
  const recoveryKey = useSelector(
    (state: AppState) => state.auth.shownRecoveryKey,
  );
  // remounted per key, so the checkbox starts unticked for every new key
  return recoveryKey ? (
    <RecoveryKeyPanel key={recoveryKey} recoveryKey={recoveryKey} />
  ) : null;
};

const RecoveryKeyPanel = ({ recoveryKey }: { recoveryKey: string }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const email = useSelector((state: AppState) => state.auth.user);
  const [saved, setSaved] = useState(false);

  const close = () => dispatch(SHOW_RECOVERY_KEY(null));

  const handleCopy = () =>
    navigator.clipboard
      .writeText(recoveryKey)
      .then(() => dispatch(ADD_SUCCESS_TOAST(t("recoveryKey.copied"))))
      .catch(() => dispatch(ADD_ERROR_TOAST(t("recoveryKey.copyFailed"))));

  const handleDownload = () => {
    const text = t("recoveryKey.fileText", {
      email,
      key: recoveryKey,
      url: window.location.origin + "/recover",
    });
    downloadFile(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      "mrmetis-recovery-key.txt",
    );
  };

  const handleSkip = () => {
    if (window.confirm(t("recoveryKey.skipConfirm"))) {
      close();
    }
  };

  return (
    <div className="recovery-key-overlay">
      <div
        className="recovery-key-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-key-header"
      >
        <h3 id="recovery-key-header">{t("recoveryKey.header")}</h3>
        <p>{t("recoveryKey.text")}</p>
        <code className="recovery-key" data-testid="recovery-key">
          {recoveryKey}
        </code>
        <div className="crud">
          <Button onClick={handleCopy}>{t("recoveryKey.copy")}</Button>
          <Button onClick={handleDownload}>{t("recoveryKey.download")}</Button>
        </div>
        <p>{t("recoveryKey.warning")}</p>
        <label className="saved">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.currentTarget.checked)}
          />{" "}
          {t("recoveryKey.saved")}
        </label>
        <div className="crud">
          <CtaButton type="button" disabled={!saved} onClick={close}>
            {t("recoveryKey.done")}
          </CtaButton>
          <Button variant="plain" onClick={handleSkip}>
            {t("recoveryKey.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryKeyDialog;
