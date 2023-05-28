import React, { useEffect, useMemo, useState } from "react";
import Labeled from "./Labeled";
import { Formik, FormikErrors } from "formik";
import { Select, MenuItem } from "@mui/material";
import DatePicker from "react-datepicker";
import { IStatement } from "store/userdata/userdata.types";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  addStatement,
  deleteStatement,
  updateStatement,
} from "store/userdata/userdata.actions";
import { getById, getNextId } from "helpers/userdata";
import { SET_SELECTED_STATEMENT } from "store/ui/ui.slice";
import "react-datepicker/dist/react-datepicker.css";
import { useTranslation } from "react-i18next";

const ListAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { statements, budgets, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { selectedStatementId } = useSelector((state: AppState) => state.ui.ui);

  const defaultFormValues = useMemo(() => {
    return {
      id: 0,
      dateCreated: new Date(),
      amount: 0,
      comment: "",
      date: new Date(),
      budgetId: 0,
      accountId: 0,
    };
  }, []);

  const [date, setDate] = useState<Date>(new Date());
  const [formValues, setFormValues] = useState<IStatement>(defaultFormValues);

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_STATEMENT(undefined));
  };

  const onDeleteClick = () => {
    if (selectedStatementId) {
      dispatch(deleteStatement(selectedStatementId));
    }
  };

  useEffect(() => {
    if (!selectedStatementId) {
      setFormValues(defaultFormValues);
      return;
    }

    let item = getById(statements, selectedStatementId);
    if (!item) {
      return;
    }

    setFormValues({
      ...defaultFormValues,
      ...item,
    });
  }, [statements, defaultFormValues, selectedStatementId]);

  return (
    <div>
      <Formik
        initialValues={formValues}
        enableReinitialize={true}
        validate={(values) => {
          const errors: FormikErrors<IStatement> = {};

          if (!values.amount) {
            errors.amount = "errors.amountEmpty";
          }
          if (!values.date) {
            errors.date = "errors.dateEmpty";
          }
          if (!values.budgetId) {
            errors.budgetId = "errors.budgetEmpty";
          }
          if (!values.accountId) {
            errors.accountId = "errors.accountEmpty";
          }

          return errors;
        }}
        onSubmit={(values) => {
          const st: IStatement = {
            ...values,
            date: date ?? new Date(),
          };

          if (values.id) {
            dispatch(updateStatement(st));
          } else {
            st.id = getNextId(statements);
            dispatch(addStatement(st));
          }

          setFormValues(defaultFormValues);
          dispatch(SET_SELECTED_STATEMENT(undefined));
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
              <Labeled labelKey="statement.amount" required>
                <input
                  type="number"
                  id="amount"
                  value={values.amount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </Labeled>
              <Labeled labelKey="statement.date" required>
                <DatePicker
                  id="date"
                  name="date"
                  selected={date}
                  onChange={(date) => setDate(date ?? new Date())}
                />
              </Labeled>
              <Labeled labelKey="statement.budget" required>
                <Select
                  id="budgetId"
                  name="budgetId"
                  value={values.budgetId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  {budgets.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </Labeled>
              <Labeled labelKey="statement.account" required>
                <Select
                  id="accountId"
                  name="accountId"
                  value={values.accountId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  {accounts.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </Labeled>
              <Labeled labelKey="statement.comment">
                <textarea
                  id="comment"
                  value={values.comment}
                  onChange={handleChange}
                />
              </Labeled>
            </div>
            <div className="controls">
              {!!values.id && (
                <>
                  <input
                    type="submit"
                    className="btn small primary"
                    value={t("statement.edit")}
                    disabled={!isValid}
                  />
                  <input
                    type="button"
                    className="btn small"
                    value={t("statement.cancel")}
                    onClick={() => onCancelEditClick()}
                  />
                  <input
                    type="button"
                    className="btn small"
                    value={t("statement.delete")}
                    onClick={() => onDeleteClick()}
                  />
                </>
              )}
              {!values.id && (
                <input
                  type="submit"
                  className="btn small primary"
                  value={t("statement.add")}
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

export default ListAddOrEdit;
