import TableRow from "components/Planning/TableRow";
import useBudget from "hooks/useBudget";
import { Moment } from "moment";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { BudgetTypeUser } from "store/userdata/userdata.types";

export interface IRemainingPlannedExpencesProps {
  month: Moment;
  budgetPairArray: BudgetPairArray;
}

const RemainingPlannedExpences: FC<IRemainingPlannedExpencesProps> = ({
  month,
  budgetPairArray,
}) => {
  const { t } = useTranslation();
  const { budgets } = useBudget();

  const parentBudgets = useMemo(
    () => budgets.filter((b) => !b.parentId),
    [budgets]
  );

  return (
    <div>
      <h3>{t("dashboard.remainingPlannedExpences")}</h3>
      <table className="planning-table">
        <thead>
          <tr>
            <th>{t("planning.name")}</th>
            <th>{t("planning.planned")}</th>
            <th>{t("planning.actual")}</th>
          </tr>
        </thead>
        <tbody>
          {parentBudgets.map((ab) => (
            <TableRow
              key={ab.id}
              budget={ab}
              months={[month]}
              budgetPairArray={budgetPairArray}
              moreIsGood={ab.type === BudgetTypeUser.income}
              onlyRemaining={true}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RemainingPlannedExpences;
