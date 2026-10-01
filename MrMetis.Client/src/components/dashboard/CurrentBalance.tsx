import useAccount from "hooks/useAccount";
import { Moment } from "moment";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetPairArray";
import { BudgetTypeExtra } from "store/userdata/userdata.types";
import useLocale from "hooks/useLocale";

export interface ICurrentBalanceProps {
  month: Moment;
  budgetPairArray: BudgetPairArray;
}

const CurrentBalance: FC<ICurrentBalanceProps> = ({
  month,
  budgetPairArray,
}) => {
  const { t } = useTranslation();
  const { formatAmount } = useLocale();
  const { accounts, getById: getAccountById } = useAccount();

  return (
    <div>
      <h3>{t("dashboard.currentBalance")}</h3>
      <table>
        <tbody>
          {accounts?.map((a) => (
            <tr key={a.id}>
              <td>{getAccountById(a.id)?.name}</td>
              <td>
                {formatAmount(
                  budgetPairArray.getTotalPair(
                    [BudgetTypeExtra.closingBalance],
                    month,
                    a.id,
                  ).actual,
                )}
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>{t("dashboard.total")}</strong>
            </td>
            <td>
              <strong>
                {formatAmount(
                  budgetPairArray.getTotalPair(
                    [BudgetTypeExtra.closingBalance],
                    month,
                  ).actual,
                )}
              </strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CurrentBalance;
