import moment from "moment";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
} from "store/userdata/userdata.types";
import { AmountToken } from "types/IAmount";
import { formatExpression, ValueToken } from "services/amountExpression";
import useAccount from "./useAccount";
import useBudget from "./useBudget";
import useLocale from "./useLocale";

// Names of what amount expressions use, and their readable text.
const useAmountTokenText = () => {
  const { t, i18n } = useTranslation();
  const { getById: getBudgetById } = useBudget();
  const { getById: getAccountById } = useAccount();
  const { formatNumber } = useLocale();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const weekdayNames = useMemo(
    () => moment.localeData(language).weekdays(),
    [language]
  );

  const typeLabel = useCallback(
    (type: BudgetType) =>
      t(`budgetType.${BudgetTypeUser[type] ?? BudgetTypeExtra[type]}`),
    [t]
  );

  const formatValue = useCallback(
    (token: ValueToken) => {
      if (token.kind === "number") {
        return formatNumber(token.value);
      }

      const details = [
        "accountId" in token && token.accountId
          ? (getAccountById(token.accountId)?.name ?? `#${token.accountId}`)
          : undefined,
        token.prevMonth ? t("budget.expression.prevMonth") : undefined,
      ].filter(Boolean);
      const suffix = details.length ? ` (${details.join(", ")})` : "";

      switch (token.kind) {
        case "budget": {
          const name =
            getBudgetById(token.budgetId)?.name ?? `#${token.budgetId}`;
          return `${name}${suffix}`;
        }
        case "total":
          return `${typeLabel(token.budgetType)}${suffix}`;
        case "daysInMonth":
          return `${t("budget.expression.daysInMonth")}${suffix}`;
        case "weekdays": {
          const day = weekdayNames[token.weekday];
          return `${t("budget.expression.weekdaysOf", { day })}${suffix}`;
        }
      }
    },
    [t, formatNumber, getAccountById, getBudgetById, typeLabel, weekdayNames]
  );

  const formatTokens = useCallback(
    (tokens: AmountToken[] | undefined) => formatExpression(tokens, formatValue),
    [formatValue]
  );

  return { typeLabel, weekdayNames, formatTokens };
};

export default useAmountTokenText;
