import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import BudgetAddOrEdit from "components/budget/BudgetAddOrEdit";
import { useTranslation } from "react-i18next";
import { EditButton, FilterInput, NoData, PageHeader } from "components/ui";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import moment from "moment";
import useBudget from "hooks/useBudget";
import useAccount from "hooks/useAccount";
import useEditRoute from "hooks/useEditRoute";
import useLocale from "hooks/useLocale";

const BudgetPage = () => {
  const { t } = useTranslation();
  const { formatAmount } = useLocale();
  const formatPlanned = (value?: number) =>
    value === undefined ? "Not found" : formatAmount(value);

  const { isFetching, loaded } = useSelector((state: AppState) => state.data);
  const { budgets, getById: getBudgetById, filtered } = useBudget();
  const { getById: getAccountById } = useAccount();

  const { selectedId, openNew, openEdit, close } = useEditRoute("/budget");

  const showAddOrEdit = selectedId === 0 || !!getBudgetById(selectedId);

  const { budgetPairArray } = useBudgetCalculate(0, 0);

  const [filter, setFilter] = useState<string>("");
  const filteredBudgets = useMemo(() => {
    return [...filtered(filter)].sort((a, b) => b.id - a.id);
  }, [filtered, filter]);

  return (
    <>
      <PageHeader
        title="budget.header"
        isOpen={showAddOrEdit}
        onToggle={showAddOrEdit ? close : openNew}
      />
      {!isFetching && (
        <>
          {showAddOrEdit && (
            <BudgetAddOrEdit id={selectedId!} onClose={close} />
          )}
          {loaded && budgets.length === 0 ? (
            <NoData message="noData.budget" />
          ) : (
            <div>
              <FilterInput
                label="budget.filter"
                value={filter}
                onChange={setFilter}
              />
              <table>
                <thead>
                  <tr>
                    <th>{t("budget.id")}</th>
                    <th>{t("budget.name")}</th>
                    <th>{t("budget.type")}</th>
                    <th>{t("budget.parent")}</th>
                    <th>{t("budget.account")}</th>
                    <th>{t("budget.currentAmount")}</th>
                    <th>{t("budget.expectOneStatement")}</th>
                    <th>&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBudgets.map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.name}</td>
                      <td>{t(`budgetType.${BudgetTypeUser[b.type]}`)}</td>
                      <td>{getBudgetById(b.parentId)?.name ?? ""}</td>
                      <td>{`${getAccountById(b.fromAccountId)?.name ?? ""}${
                        b.type === BudgetTypeUser.transferToAccount
                          ? ` - ${getAccountById(b.toAccountId)?.name ?? ""}`
                          : ""
                      }`}</td>
                      <td>
                        {formatPlanned(
                          budgetPairArray.getBudgetPair(b.id, moment())
                            ?.planned,
                        )}
                      </td>
                      <td>
                        {b.expectOneStatement
                          ? t("general.yes")
                          : t("general.no")}
                      </td>
                      <td>
                        <EditButton onClick={() => openEdit(b.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default BudgetPage;
