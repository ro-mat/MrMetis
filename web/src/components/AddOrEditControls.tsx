import { useTranslation } from "react-i18next";
import { Button, CancelButton, CtaButton } from "./ui";

interface IAddOrEditControlsProps {
  isNew: boolean;
  isValid: boolean;
  // i18n keys of the current validation errors, shown on the disabled submit
  validationErrors: string[];
  onCancelEditClick: () => void;
  onDeleteClick: () => void;
  // disables delete and tells the user why
  deleteDisabledReason?: string;
}

// Submit / cancel / delete buttons at the bottom of every add-or-edit form.
const AddOrEditControls = ({
  isNew,
  isValid,
  validationErrors,
  onCancelEditClick,
  onDeleteClick,
  deleteDisabledReason,
}: IAddOrEditControlsProps) => {
  const { t } = useTranslation();
  // validity may update before the error list, fall back to a generic message
  const invalidReason = validationErrors.length
    ? validationErrors.map((e) => <div key={e}>{t(e)}</div>)
    : t("addOrEdit.invalidForm");

  if (isNew) {
    return (
      <div className="controls">
        <CtaButton disabled={!isValid} disabledReason={invalidReason}>
          {t("addOrEdit.add")}
        </CtaButton>
      </div>
    );
  }

  return (
    <div className="controls">
      <CtaButton disabled={!isValid} disabledReason={invalidReason}>
        {t("addOrEdit.edit")}
      </CtaButton>
      <CancelButton onClick={onCancelEditClick} />
      <Button
        onClick={onDeleteClick}
        disabled={!!deleteDisabledReason}
        disabledReason={deleteDisabledReason}
      >
        {t("addOrEdit.delete")}
      </Button>
    </div>
  );
};

export default AddOrEditControls;
