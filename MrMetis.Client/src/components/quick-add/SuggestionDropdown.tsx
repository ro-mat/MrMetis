import { ISuggestion } from "hooks/useStatementSuggestions";
import { useTranslation } from "react-i18next";

export interface IDropdownProps {
  inputText: string;
  suggestions: ISuggestion[];
  selectedSuggestion: string;
  handleClickSuggestion: () => void;
  setSelectedSuggestion: (id: string) => void;
}

const SuggestionDropdown = ({
  inputText,
  suggestions,
  selectedSuggestion,
  handleClickSuggestion,
  setSelectedSuggestion,
}: IDropdownProps) => {
  const { t } = useTranslation();
  return (
    <div className="dropdown-wrapper">
      {suggestions.length > 0 &&
        suggestions.map((s) => (
          <div
            key={s.id}
            className={`${s.id === selectedSuggestion ? "selected" : ""}`}
            onMouseOver={() => setSelectedSuggestion(s.id)}
            onClick={handleClickSuggestion}
          >
            {s.text}
          </div>
        ))}
      {suggestions.length === 0 && inputText.length > 2 && (
        <div>{t("quickAdd.nothingFound")}</div>
      )}
    </div>
  );
};

export default SuggestionDropdown;
