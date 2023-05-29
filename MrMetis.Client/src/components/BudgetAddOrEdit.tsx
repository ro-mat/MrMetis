import React, { useEffect, useMemo, useState } from "react";
import Labeled from "./Labeled";
import { DatePickerField } from "./DatePickerField";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { Field, Formik, FormikErrors, FieldArray } from "formik";
import { Select, MenuItem } from "@mui/material";
import { BudgetTypeUser, IBudget } from "store/userdata/userdata.types";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  addBudget,
  deleteBudget,
  updateBudget,
} from "store/userdata/userdata.actions";
import { getById, getNextId } from "helpers/userdata";
import { SET_SELECTED_BUDGET } from "store/ui/ui.slice";
import moment from "moment";
import { useTranslation } from "react-i18next";
import Hint from "./Hint";

const BudgetAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { budgets, accounts, statements } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { selectedBudgetId } = useSelector((state: AppState) => state.ui.ui);

  const defaultFormValues = useMemo(() => {
    return {
      id: 0,
      dateCreated: new Date(),
      parentId: 0,
      fromAccountId: 0,
      toAccountId: 0,
      name: "",
      isEssential: false,
      amounts: [],
      overrides: [],
      type: BudgetTypeUser.spending,
      expectOneStatement: false,
    };
  }, []);

  const [formValues, setFormValues] = useState<IBudget>(defaultFormValues);

  const disableDelete = useMemo(
    () =>
      selectedBudgetId !== undefined &&
      (budgets.findIndex((b) => b.parentId === selectedBudgetId) >= 0 ||
        statements.findIndex((s) => s.budgetId === selectedBudgetId) >= 0),
    [selectedBudgetId, budgets, statements]
  );

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_BUDGET(undefined));
  };

  const onDeleteClick = () => {
    if (selectedBudgetId && !disableDelete) {
      dispatch(deleteBudget(selectedBudgetId));
    }
  };

  useEffect(() => {
    if (!selectedBudgetId) {
      setFormValues(defaultFormValues);
      return;
    }

    let item = getById(budgets, selectedBudgetId);
    if (!item) {
      return;
    }

    if (item.parentId) {
      const parent = getById(budgets, item.parentId);
      item = { ...item, fromAccountId: parent?.fromAccountId ?? 0 };
    }

    setFormValues({
      ...defaultFormValues,
      ...item,
      amounts: [...item.amounts].sort((a, b) =>
        moment(b.startDate).diff(moment(a.startDate))
      ),
      overrides: [...item.overrides].sort((a, b) =>
        moment(b.month).diff(moment(a.month))
      ),
    });
  }, [budgets, defaultFormValues, selectedBudgetId]);

  return (
    <div>
      <Formik
        validateOnChange={true}
        enableReinitialize={true}
        initialValues={formValues}
        validate={(values) => {
          const errors: FormikErrors<IBudget> = {};

          if (!values.name) {
            errors.name = "errors.nameEmpty";
          }
          if (!values.type) {
            errors.type = "errors.typeEmpty";
          }
          if (!values.fromAccountId) {
            errors.fromAccountId = "errors.fromAccountEmpty";
          }
          if (
            values.type === BudgetTypeUser.transferToAccount &&
            !values.toAccountId
          ) {
            errors.toAccountId = "errors.toAccountEmpty";
          }

          for (let amount of values.amounts) {
            if (!amount.startDate) {
              errors.amounts = "errors.dateEmpty";
              break;
            }
            if (!amount.frequency) {
              errors.amounts = "errors.frequencyEmpty";
              break;
            }
          }
          for (let amount of values.overrides) {
            if (!amount.month) {
              errors.amounts = "errors.monthEmpty";
              break;
            }
          }

          return errors;
        }}
        onSubmit={(values) => {
          const budget = {
            ...values,
          };

          if (values.id) {
            dispatch(updateBudget(budget));
          } else {
            budget.id = getNextId(budgets);
            dispatch(addBudget(budget));
          }

          setFormValues(defaultFormValues);
          dispatch(SET_SELECTED_BUDGET(undefined));
        }}
      >
        {({
          values,
          isValid,
          errors,
          touched,
          handleSubmit,
          handleChange,
          handleBlur,
        }) => (
          <form onSubmit={handleSubmit}>
            <div className="crud">
              <Labeled labelKey="budget.name" required>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </Labeled>
              <Labeled labelKey="budget.type" required>
                <Select
                  id="type"
                  name="type"
                  value={values.type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  {[10, 20, 30, 40, 50, 60].map((i) => (
                    <MenuItem key={i} value={i}>
                      {t(`budgetType.${BudgetTypeUser[i]}`)}
                    </MenuItem>
                  ))}
                </Select>
              </Labeled>
              <Labeled labelKey="budget.parent">
                <Select
                  id="parentId"
                  name="parentId"
                  value={values.parentId ?? ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      values.fromAccountId =
                        getById(budgets, +e.target.value)?.fromAccountId ?? 0;
                    }

                    handleChange(e);
                  }}
                >
                  <MenuItem value={0}>{t("general.no")}</MenuItem>
                  {budgets
                    .filter((b) => b.type === values.type && b.id !== values.id)
                    .map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.name}
                      </MenuItem>
                    ))}
                </Select>
              </Labeled>
              <Labeled labelKey="budget.fromAccount" required>
                <Select
                  id="fromAccountId"
                  name="fromAccountId"
                  value={values.fromAccountId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={
                    !!(
                      values.parentId &&
                      getById(budgets, values.parentId)?.fromAccountId
                    )
                  }
                >
                  <MenuItem value={0}>{t("general.no")}</MenuItem>
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </Labeled>
              {values.type === BudgetTypeUser.transferToAccount && (
                <Labeled labelKey="budget.toAccount" required>
                  <Select
                    id="toAccountId"
                    name="toAccountId"
                    value={values.toAccountId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  >
                    <MenuItem value={0}>{t("general.no")}</MenuItem>
                    {accounts
                      .filter((a) => a.id !== values.fromAccountId)
                      .map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                        </MenuItem>
                      ))}
                  </Select>
                </Labeled>
              )}
              <Labeled labelKey="budget.expectOneStatement">
                <Field
                  type="checkbox"
                  name="expectOneStatement"
                  checked={values.expectOneStatement}
                />
              </Labeled>
            </div>
            <FieldArray
              name="amounts"
              render={({ unshift, remove }) => (
                <div className="list-wrapper">
                  <Labeled labelKey="budget.amounts" horisontal={true}>
                    <button
                      type="button"
                      className="small secondary"
                      onClick={() =>
                        unshift({
                          amount: "0",
                          frequency: 1,
                          startDate: new Date(),
                        })
                      }
                    >
                      +
                    </button>
                  </Labeled>
                  <div>
                    <Hint label={t("budget.amountHint.label")}>
                      <pre>{t("budget.amountHint.description")}</pre>
                    </Hint>
                  </div>
                  <div className="list">
                    {values.amounts?.map((amount, index) => (
                      <div key={index}>
                        <Labeled labelKey="budget.startDate" required>
                          <DatePickerField
                            name={`amounts[${index}].startDate`}
                          />
                        </Labeled>
                        <Labeled labelKey="budget.endDate">
                          <DatePickerField name={`amounts[${index}].endDate`} />
                        </Labeled>
                        <Labeled labelKey="budget.amount">
                          <input
                            type="text"
                            name={`amounts[${index}].amount`}
                            value={amount.amount}
                            onChange={handleChange}
                          />
                        </Labeled>
                        <Labeled labelKey="budget.frequency" required>
                          <input
                            type="number"
                            name={`amounts[${index}].frequency`}
                            value={amount.frequency}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        </Labeled>
                        <div>
                          <button
                            type="button"
                            className="button"
                            onClick={() => remove(index)}
                          >
                            <FontAwesomeIcon icon={faTrashCan} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            />
            <FieldArray
              name="overries"
              render={({ unshift, remove }) => (
                <div className="list-wrapper">
                  <Labeled labelKey="budget.overrides" horisontal={true}>
                    <button
                      type="button"
                      className="small secondary"
                      onClick={() =>
                        unshift({ month: new Date(), amount: "0" })
                      }
                    >
                      +
                    </button>
                  </Labeled>
                  <div className="list">
                    {values.overrides?.map((ovr, index) => (
                      <div key={index}>
                        <Labeled labelKey="budget.month" required>
                          <DatePickerField name={`overrides[${index}].month`} />
                        </Labeled>
                        <Labeled labelKey="budget.amount">
                          <input
                            type="number"
                            name={`overrides[${index}].amount`}
                            value={ovr.amount}
                            onChange={handleChange}
                          />
                        </Labeled>

                        <div>
                          <button type="button" onClick={() => remove(index)}>
                            <FontAwesomeIcon icon={faTrashCan} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            />
            <div className="controls">
              {!!values.id && (
                <>
                  <input
                    type="submit"
                    className="btn small primary"
                    value={t("budget.edit")}
                    disabled={!isValid}
                  />
                  <input
                    type="button"
                    className="btn small"
                    value={t("budget.cancel")}
                    onClick={() => onCancelEditClick()}
                  />
                  <input
                    type="button"
                    className="btn small"
                    value={t("budget.delete")}
                    onClick={() => onDeleteClick()}
                    disabled={disableDelete}
                  />
                  {disableDelete && (
                    <Hint label="?">{t("budget.hintDeleteDisabled")}</Hint>
                  )}
                </>
              )}
              {!values.id && (
                <input
                  type="submit"
                  className="btn small primary"
                  value={t("budget.add")}
                  disabled={!isValid}
                />
              )}
            </div>
          </form>
        )}
      </Formik>
    </div>
  );
};

export default BudgetAddOrEdit;
