import useAccount from "hooks/useAccount";
import { Moment } from "moment";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { BudgetTypeExtra } from "store/userdata/userdata.types";

export interface ICurrentBalanceProps {
  month: Moment;
  budgetPairArray: BudgetPairArray;
}

const CurrentBalance: FC<ICurrentBalanceProps> = ({
  month,
  budgetPairArray,
}) => {
  const { t } = useTranslation();
  const { accounts, getById: getAccountById } = useAccount();

  return (
    <div>
      <h3>{t("dashboard.currentBalance")}</h3>
      <table>
        <tbody>
          {accounts?.map((a) => (
            <tr>
              <td>{getAccountById(a.id)?.name}</td>
              <td>
                {budgetPairArray
                  .getTotalPair([BudgetTypeExtra.closingBalance], month, a.id)
                  .actual.toFixed(2)}
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>{t("dashboard.total")}</strong>
            </td>
            <td>
              <strong>
                {budgetPairArray
                  .getTotalPair([BudgetTypeExtra.closingBalance], month)
                  .actual.toFixed(2)}
              </strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CurrentBalance;
