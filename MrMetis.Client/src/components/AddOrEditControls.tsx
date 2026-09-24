import { useTranslation } from "react-i18next";
import Hint from "./Hint";
import { Button, CancelButton, CtaButton } from "./ui";

interface IAddOrEditControlsProps {
  isNew: boolean;
  isValid: boolean;
  onCancelEditClick: () => void;
  onDeleteClick: () => void;
  disableDelete: boolean;
}

// Submit / cancel / delete buttons at the bottom of every add-or-edit form.
const AddOrEditControls = ({
  isNew,
  isValid,
  onCancelEditClick,
  onDeleteClick,
  disableDelete,
}: IAddOrEditControlsProps) => {
  const { t } = useTranslation();

  if (isNew) {
    return (
      <div className="controls">
        <CtaButton disabled={!isValid}>{t("addOrEdit.add")}</CtaButton>
      </div>
    );
  }

  return (
    <div className="controls">
      <CtaButton disabled={!isValid}>{t("addOrEdit.edit")}</CtaButton>
      <CancelButton onClick={onCancelEditClick} />
      <Button onClick={onDeleteClick} disabled={disableDelete}>
        {t("addOrEdit.delete")}
      </Button>
      {disableDelete && (
        <Hint label="?">{t("addOrEdit.hintDeleteDisabled")}</Hint>
      )}
    </div>
  );
};

export default AddOrEditControls;
