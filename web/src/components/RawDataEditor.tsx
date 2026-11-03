import useToggle from "hooks/useToggle";
import useFeatures from "hooks/useFeatures";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { selectHasSession } from "store/auth/auth.selectors";
import { ADD_ERROR_TOAST } from "store/ui/ui.slice";
import { loadUserdata } from "store/userdata/userdata.actions";
import { SAVE_CHANGES, SET_USERDATA } from "store/userdata/userdata.slice";
import { IUserdata } from "store/userdata/userdata.types";
import { Button, CtaButton, TextArea } from "components/ui";

const RawDataEditor = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { userdata } = useSelector((state: AppState) => state.data);
  const hasSession = useSelector(selectHasSession);
  const features = useFeatures();

  const [isOpen, toggle] = useToggle(false);
  // the edited text; null shows the current data
  const [draft, setDraft] = useState<string | null>(null);

  // Serializing all data is expensive, so only do it while the editor is open.
  const userdataStr = useMemo(
    () => (isOpen ? JSON.stringify(userdata, undefined, 1) : ""),
    [userdata, isOpen],
  );

  const handleToggle = () => {
    setDraft(null);
    toggle();
  };

  const handleSubmit = () => {
    try {
      dispatch(SET_USERDATA(JSON.parse(draft ?? userdataStr) as IUserdata));
      dispatch(SAVE_CHANGES());
      setDraft(null);
    } catch (err) {
      dispatch(ADD_ERROR_TOAST((err as Error).message));
    }
  };

  const handleDiscard = () => {
    setDraft(null);
    dispatch(loadUserdata());
  };

  if (!hasSession || !features?.rawData) {
    return null;
  }

  return (
    <div id="raw-data-editor" className={isOpen ? "show" : ""}>
      <div className="toggle" onClick={handleToggle}>
        {isOpen ? "<" : ">"}
      </div>
      <div className="content">
        <TextArea
          className="edit-box"
          value={draft ?? userdataStr}
          onChange={(e) => setDraft(e.currentTarget.value)}
        />
        <div className="controls">
          <Button onClick={handleDiscard}>{t("rawData.discard")}</Button>
          <CtaButton type="button" onClick={handleSubmit}>
            {t("rawData.save")}
          </CtaButton>
        </div>
      </div>
    </div>
  );
};

export default RawDataEditor;
