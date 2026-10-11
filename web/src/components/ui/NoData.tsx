import React from "react";
import { useTranslation } from "react-i18next";

interface INoDataProps {
  message: string; // i18n key
}

// Shown instead of a page's content when there's nothing to show yet (e.g. a new user).
const NoData = ({ message }: INoDataProps) => {
  const { t } = useTranslation();
  return <p className="no-data">{t(message)}</p>;
};

export default NoData;
