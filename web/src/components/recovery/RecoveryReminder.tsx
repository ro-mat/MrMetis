import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppState, TAppDispatch } from "store/store";
import { SET_RECOVERY_REMINDER } from "store/auth/auth.slice";
import { Button } from "components/ui";

// After login, for an account without a recovery key, until dismissed.
const RecoveryReminder = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();
  const navigate = useNavigate();
  const show = useSelector(
    (state: AppState) =>
      state.auth.recoveryReminder && !state.auth.shownRecoveryKey,
  );

  if (!show) return null;

  const dismiss = () => dispatch(SET_RECOVERY_REMINDER(false));

  return (
    <div id="recovery-reminder">
      <span>{t("recoveryKey.reminder")}</span>
      <span>
        <Button
          onClick={() => {
            dismiss();
            navigate("/preferences");
          }}
        >
          {t("recoveryKey.setUp")}
        </Button>{" "}
        <Button onClick={dismiss}>{t("recoveryKey.later")}</Button>
      </span>
    </div>
  );
};

export default RecoveryReminder;
