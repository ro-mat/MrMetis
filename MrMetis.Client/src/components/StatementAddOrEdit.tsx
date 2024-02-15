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
import { SET_SELECTED_STATEMENT } from "store/ui/ui.slice";
import "react-datepicker/dist/react-datepicker.css";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";
import useStatement from "hooks/useStatement";
import { statementAddOrEditFormDefault } from "helpers/constants/defaults";

const StatementAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { budgets, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { selectedStatementId } = useSelector((state: AppState) => state.ui.ui);
  const { getById: getStatementById, getNextId: getNextStatementId } =
    useStatement();

  const defaultFormValues = useMemo(() => {
    return statementAddOrEditFormDefault;
  }, []);

  const [date, setDate] = useState(defaultFormValues.date);
  const [formValues, setFormValues] = useState<IStatement>(defaultFormValues);

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_STATEMENT(undefined));
  };

  const onDeleteClick = () => {
    if (selectedStatementId) {
      dispatch(deleteStatement(selectedStatementId));
      dispatch(SET_SELECTED_STATEMENT(undefined));
    }
  };

  useEffect(() => {
    if (!selectedStatementId) {
      setFormValues(defaultFormValues);
      return;
    }

    let item = getStatementById(selectedStatementId);
    if (!item) {
      return;
    }

    setFormValues({
      ...defaultFormValues,
      ...item,
    });
    setDate(moment(item.date).format(DATE_FORMAT));
  }, [defaultFormValues, selectedStatementId, getStatementById]);

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
            date: date ?? moment().toString(),
          };

          if (values.id) {
            dispatch(updateStatement(st));
          } else {
            st.id = getNextStatementId();
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
                  selected={moment(date).toDate()}
                  onChange={(date) =>
                    setDate(
                      (date ? moment(date) : moment()).format(DATE_FORMAT)
                    )
                  }
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

export default StatementAddOrEdit;
