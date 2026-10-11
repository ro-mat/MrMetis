import React from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

interface IPageHeaderProps {
  title: string; // i18n key
  // when given, a +/- button toggles the page's add/edit form
  isOpen?: boolean;
  onToggle?: () => void;
}

const PageHeader = ({ title, isOpen, onToggle }: IPageHeaderProps) => {
  const { t } = useTranslation();
  return (
    <div className="head-wrapper">
      <h2>{t(title)}</h2>
      {onToggle && (
        <Button variant="plain" size="normal" onClick={onToggle}>
          {isOpen ? "-" : "+"}
        </Button>
      )}
    </div>
  );
};

export default PageHeader;
