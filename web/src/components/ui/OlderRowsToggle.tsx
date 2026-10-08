import React from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

interface IOlderRowsToggleProps {
  hiddenCount: number;
  showOlder: boolean;
  onToggle: () => void;
}

// "Show older items" link under a list; nothing to show, no link.
const OlderRowsToggle = ({
  hiddenCount,
  showOlder,
  onToggle,
}: IOlderRowsToggleProps) => {
  const { t } = useTranslation();

  if (!hiddenCount) {
    return null;
  }

  return (
    <Button variant="plain" size="normal" className="link" onClick={onToggle}>
      {showOlder
        ? t("addOrEdit.hideOlder")
        : t("addOrEdit.showOlder", { count: hiddenCount })}
    </Button>
  );
};

export default OlderRowsToggle;
