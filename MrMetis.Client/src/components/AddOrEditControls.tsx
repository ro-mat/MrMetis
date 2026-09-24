import { useTranslation } from "react-i18next";
import Hint from "./Hint";

interface IAddOrEditControlsProps {
  isNew: boolean;
  isValid: boolean;
  onCancelEditClick: () => void;
  onDeleteClick: () => void;
  disableDelete: boolean;
}

const AddOrEditControls = ({
  isNew,
  isValid,
  onCancelEditClick,
  onDeleteClick,
  disableDelete,
}: IAddOrEditControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="controls">
      {!isNew && (
        <>
          <input
            type="submit"
            className="btn small primary"
            value={t("addOrEdit.edit")}
            disabled={!isValid}
          />
          <input
            type="button"
            className="btn small"
            value={t("addOrEdit.cancel")}
            onClick={() => onCancelEditClick()}
          />
          <input
            type="button"
            className="btn small"
            value={t("addOrEdit.delete")}
            onClick={() => onDeleteClick()}
            disabled={disableDelete}
          />
          {disableDelete && (
            <Hint label="?">{t("addOrEdit.hintDeleteDisabled")}</Hint>
          )}
        </>
      )}
      {isNew && (
        <input
          type="submit"
          className="btn small primary"
          value={t("addOrEdit.add")}
          disabled={!isValid}
        />
      )}
    </div>
  );
};

export default AddOrEditControls;
