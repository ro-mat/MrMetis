import React from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Button, { IButtonProps } from "./Button";
import { cx } from "./cx";

type IIconButtonProps = Omit<IButtonProps, "children" | "variant">;

// Opens a table row for editing.
export const EditButton = (props: IIconButtonProps) => {
  const { t } = useTranslation();
  return (
    <Button variant="plain" aria-label={t("addOrEdit.edit")} {...props}>
      <FontAwesomeIcon icon={faPenToSquare} />
    </Button>
  );
};

// Removes a row from a list (e.g. an amount of a budget).
export const RemoveButton = (props: IIconButtonProps) => {
  const { t } = useTranslation();
  return (
    <Button
      variant="plain"
      size="normal"
      aria-label={t("addOrEdit.delete")}
      {...props}
    >
      <FontAwesomeIcon icon={faTrashCan} />
    </Button>
  );
};

// Round "X" in the corner of a popup.
export const CloseButton = ({ className, ...props }: IIconButtonProps) => (
  <Button
    variant="plain"
    size="normal"
    className={cx("close", className)}
    {...props}
  >
    X
  </Button>
);
