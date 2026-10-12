import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalculateError } from "hooks/useBudgetCalculate";
import useBudget from "hooks/useBudget";
import useAmountTokenText from "hooks/useAmountTokenText";

interface ICalculationErrorProps {
  error: CalculateError; // from useBudgetCalculate
}

// Shown when budgets can't be calculated, with links to the budgets to fix.
const CalculationError = ({ error }: ICalculationErrorProps) => {
  const { t } = useTranslation();
  const { getById } = useBudget();
  const { formatTokens } = useAmountTokenText();

  return (
    <div className="error calculation-error">
      <p>{t("errors.calculation")}</p>
      {error.problems.length > 0 ? (
        <ul>
          {error.problems.map((p, i) => (
            <li key={i}>
              <Link to={`/budget/${p.budgetId}`}>
                {getById(p.budgetId)?.name ?? `#${p.budgetId}`}
              </Link>
              :{" "}
              <code>
                {formatTokens(p.expression) || t("errors.expressionEmpty")}
              </code>
            </li>
          ))}
        </ul>
      ) : (
        <p>{error.message}</p>
      )}
    </div>
  );
};

export default CalculationError;
