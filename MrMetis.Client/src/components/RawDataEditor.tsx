import useToggle from "hooks/useToggle";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { selectHasSession } from "store/auth/auth.selectors";
import { ADD_ERROR_TOAST } from "store/ui/ui.slice";
import { loadUserdata } from "store/userdata/userdata.actions";
import { SAVE_CHANGES, SET_USERDATA } from "store/userdata/userdata.slice";
import { IUserdata } from "store/userdata/userdata.types";

const RawDataEditor = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { userdata } = useSelector((state: AppState) => state.data);
  const hasSession = useSelector(selectHasSession);

  const [isOpen, toggle] = useToggle(false);
  const [userdataStr, setUserdataStr] = useState("");

  // Serializing all data is expensive, so only do it while the editor is open.
  useEffect(() => {
    if (isOpen) {
      setUserdataStr(JSON.stringify(userdata, undefined, 1));
    }
  }, [userdata, isOpen]);

  const handleSubmit = () => {
    try {
      dispatch(SET_USERDATA(JSON.parse(userdataStr) as IUserdata));
      dispatch(SAVE_CHANGES());
    } catch (err: any) {
      dispatch(ADD_ERROR_TOAST(err.message as string));
    }
  };

  const handleDiscard = () => {
    dispatch(loadUserdata());
  };

  if (!hasSession) {
    return null;
  }

  return (
    <div id="raw-data-editor" className={isOpen ? "show" : ""}>
      <div className="toggle" onClick={toggle}>
        {isOpen ? "<" : ">"}
      </div>
      <div className="content">
        <div className="edit-box">
          <textarea
            value={userdataStr}
            onChange={(e) => setUserdataStr(e.currentTarget.value)}
          />
        </div>
        <div className="controls">
          <button onClick={handleDiscard}>{t("rawData.discard")}</button>
          <button onClick={handleSubmit}>{t("rawData.save")}</button>
        </div>
      </div>
    </div>
  );
};

export default RawDataEditor;
