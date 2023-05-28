import React from "react";
import { initDemoData } from "helpers/demoHelper";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import {
  SET_ACCOUNTS,
  SET_BUDGETS,
  SET_STATEMENTS,
} from "store/userdata/userdata.slice";
import { ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import { useTranslation } from "react-i18next";

const DemoTopBar = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const handleResetClick = () => {
    const data = initDemoData();

    dispatch(SET_STATEMENTS(data.statements));
    dispatch(SET_BUDGETS(data.budgets));
    dispatch(SET_ACCOUNTS(data.accounts));

    dispatch(ADD_SUCCESS_TOAST(t("demo.resetSuccessful")));
  };

  return (
    <div id="demo-top-bar">
      <span>{t("demo.topBarMessage")}</span>
      <span>
        <input
          type="button"
          value={t("demo.resetData")}
          onClick={handleResetClick}
        />
      </span>
    </div>
  );
};

export default DemoTopBar;
