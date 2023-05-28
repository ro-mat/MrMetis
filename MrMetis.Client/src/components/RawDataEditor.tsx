import { getDemoData } from "helpers/demoHelper";
import useToggle from "hooks/useToggle";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { ADD_ERROR_TOAST } from "store/ui/ui.slice";
import { fetchUserdata } from "store/userdata/userdata.actions";
import {
  SET_ACCOUNTS,
  SET_BUDGETS,
  SET_STATEMENTS,
  SAVE_CHANGES,
} from "store/userdata/userdata.slice";
import { IUserdata } from "store/userdata/userdata.types";

const RawDataEditor = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { userdata } = useSelector((state: AppState) => state.data);
  const { token, isDemo } = useSelector((state: AppState) => state.auth);

  const [state, toggle] = useToggle(false);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const [userdataStr, setUserdataStr] = useState("");

  useEffect(() => {
    setUserdataStr(JSON.stringify(userdata, undefined, 1));
  }, [userdata]);

  const handleToggle = () => {
    toggle();
  };

  const handleSubmit = () => {
    try {
      const newUserdata = JSON.parse(userdataStr) as IUserdata;

      dispatch(SET_ACCOUNTS(newUserdata.accounts));
      dispatch(SET_BUDGETS(newUserdata.budgets));
      dispatch(SET_STATEMENTS(newUserdata.statements));

      dispatch(SAVE_CHANGES());
    } catch (err: any) {
      dispatch(ADD_ERROR_TOAST(err.message as string));
    }
  };

  const handleDiscart = () => {
    if (isDemo) {
      const data = getDemoData();

      dispatch(SET_ACCOUNTS(data.accounts));
      dispatch(SET_BUDGETS(data.budgets));
      dispatch(SET_STATEMENTS(data.statements));
      return;
    }

    dispatch(fetchUserdata());
  };

  return (
    <>
      {(token || isDemo) && (
        <div id="raw-data-editor" className={state ? "show" : ""}>
          <div className="toggle" onClick={handleToggle}>
            {state ? "<" : ">"}
          </div>
          <div className="content">
            <div className="edit-box">
              <textarea
                ref={textRef}
                value={userdataStr}
                onChange={(e) => setUserdataStr(e.currentTarget.value)}
              />
            </div>
            <div className="controls">
              <button onClick={handleDiscart}>{t("rawData.discard")}</button>
              <button onClick={handleSubmit}>{t("rawData.save")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RawDataEditor;
