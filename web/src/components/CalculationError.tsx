import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

interface ICalculationErrorProps {
  error: string; // from useBudgetCalculate
}

// Shown when budgets can't be calculated; the budgets are fixed on the budget page.
const CalculationError = ({ error }: ICalculationErrorProps) => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="error calculation-error">
      <p>
        {t("errors.calculation")}{" "}
        {!location.pathname.startsWith("/budget") && (
          <Link to="/budget">{t("errors.calculationFix")}</Link>
        )}
      </p>
      <p>{error}</p>
    </div>
  );
};

export default CalculationError;
