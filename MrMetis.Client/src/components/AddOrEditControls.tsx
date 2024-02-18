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
            value={t("account.edit")}
            disabled={!isValid}
          />
          <input
            type="button"
            className="btn small"
            value={t("account.cancel")}
            onClick={() => onCancelEditClick()}
          />
          <input
            type="button"
            className="btn small"
            value={t("account.delete")}
            onClick={() => onDeleteClick()}
            disabled={disableDelete}
          />
          {disableDelete && (
            <Hint label="?">{t("account.hintDeleteDisabled")}</Hint>
          )}
        </>
      )}
      {isNew && (
        <input
          type="submit"
          className="btn small primary"
          value={t("account.add")}
          disabled={!isValid}
        />
      )}
      <div>{isValid ? "valid" : "not-valid"}</div>
    </div>
  );
};

export default AddOrEditControls;
