import React from "react";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import { startDemo } from "store/userdata/userdata.actions";
import { ADD_SUCCESS_TOAST } from "store/ui/ui.slice";
import { useTranslation } from "react-i18next";
import { Button } from "components/ui";

const DemoTopBar = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const handleResetClick = () => {
    dispatch(startDemo());
    dispatch(ADD_SUCCESS_TOAST(t("demo.resetSuccessful")));
  };

  return (
    <div id="demo-top-bar">
      <span>{t("demo.topBarMessage")}</span>
      <span>
        <Button onClick={handleResetClick}>{t("demo.resetData")}</Button>
      </span>
    </div>
  );
};

export default DemoTopBar;
