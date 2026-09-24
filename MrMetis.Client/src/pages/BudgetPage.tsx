import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import BudgetAddOrEdit from "components/budget/BudgetAddOrEdit";
import { SET_SELECTED_BUDGET } from "store/ui/ui.slice";
import { useTranslation } from "react-i18next";
import { EditButton, FilterInput, PageHeader } from "components/ui";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import moment from "moment";
import useBudget from "hooks/useBudget";
import useAccount from "hooks/useAccount";

const BudgetPage = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.data);
  const { getById: getBudgetById, filtered } = useBudget();
  const { getById: getAccountById } = useAccount();

  const { selectedBudgetId } = useSelector((state: AppState) => state.ui.ui);

  const showAddOrEdit = useMemo(
    () => selectedBudgetId !== undefined,
    [selectedBudgetId]
  );

  const { budgetPairArray } = useBudgetCalculate(0, 0);

  const [filter, setFilter] = useState<string>("");
  const filteredBudgets = useMemo(() => {
    return [...filtered(filter)].sort((a, b) => b.id - a.id);
  }, [filtered, filter]);

  const onEditBudgetClick = (id: number) => {
    dispatch(SET_SELECTED_BUDGET(id));
  };

  const toggleAddOrEdit = () => {
    dispatch(SET_SELECTED_BUDGET(showAddOrEdit ? undefined : 0));
  };

  return (
    <>
      <PageHeader
        title="budget.header"
        isOpen={showAddOrEdit}
        onToggle={toggleAddOrEdit}
      />
      {!isFetching && (
        <>
          {showAddOrEdit && <BudgetAddOrEdit />}
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
                      {budgetPairArray
                        .getBudgetPair(b.id, moment())
                        ?.planned.toFixed(2) ?? "Not found"}
                    </td>
                    <td>
                      {b.expectOneStatement
                        ? t("general.yes")
                        : t("general.no")}
                    </td>
                    <td>
                      <EditButton onClick={() => onEditBudgetClick(b.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default BudgetPage;
