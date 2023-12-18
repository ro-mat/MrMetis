import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import { getById } from "helpers/userdata";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import BudgetAddOrEdit from "components/budget/BudgetAddOrEdit";
import { SET_SELECTED_BUDGET } from "store/ui/ui.slice";
import { useTranslation } from "react-i18next";
import useBudgetAggregate from "hooks/useBudgetAggregate";
import Labeled from "components/Labeled";

const Budget = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.data);
  const { budgets, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { selectedBudgetId } = useSelector((state: AppState) => state.ui.ui);

  const showAddOrEdit = useMemo(
    () => selectedBudgetId !== undefined,
    [selectedBudgetId]
  );

  const { budgetMonth } = useBudgetAggregate(new Date());

  const [filter, setFilter] = useState<string>("");
  const filteredBudgets = useMemo(() => {
    return [...budgets]
      .filter(
        (b) =>
          b.id.toString().includes(filter.toLowerCase()) ||
          b.name.toLowerCase().includes(filter.toLowerCase()) ||
          BudgetTypeUser[b.type].toLowerCase().includes(filter.toLowerCase()) ||
          getById(budgets, b.parentId)
            ?.name.toLowerCase()
            .includes(filter.toLowerCase()) ||
          getById(accounts, b.fromAccountId)
            ?.name.toLowerCase()
            .includes(filter.toLowerCase()) ||
          getById(accounts, b.toAccountId)
            ?.name.toLowerCase()
            .includes(filter.toLowerCase())
      )
      .sort((a, b) => b.id - a.id);
  }, [budgets, filter, accounts]);

  const onEditBudgetClick = (id: number) => {
    dispatch(SET_SELECTED_BUDGET(id));
  };

  const handleAddOrEditButtonClick = () => {
    dispatch(SET_SELECTED_BUDGET(showAddOrEdit ? undefined : 0));
  };

  return (
    <>
      <div className="head-wrapper">
        <h2>{t("budget.header")}</h2>
        <button onClick={handleAddOrEditButtonClick}>
          {showAddOrEdit ? "-" : "+"}
        </button>
      </div>
      {!isFetching && (
        <>
          {showAddOrEdit && <BudgetAddOrEdit />}
          <div>
            <div className="filter-text">
              <Labeled labelKey="budget.filter" horisontal={true}>
                <input
                  type="text"
                  id="filter"
                  value={filter}
                  onChange={(e) => setFilter(e.currentTarget.value)}
                />
              </Labeled>
            </div>
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
                    <td>{getById(budgets, b.parentId)?.name ?? ""}</td>
                    <td>{`${getById(accounts, b.fromAccountId)?.name ?? ""}${
                      b.type === BudgetTypeUser.transferToAccount
                        ? ` - ${getById(accounts, b.toAccountId)?.name ?? ""}`
                        : ""
                    }`}</td>
                    <td>
                      {budgetMonth?.getItem(b.id)?.planned.toFixed(2) ??
                        "Not found"}
                    </td>
                    <td>
                      {b.expectOneStatement
                        ? t("general.yes")
                        : t("general.no")}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="small"
                        onClick={() => onEditBudgetClick(b.id)}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
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

export default Budget;
