import React, { useEffect, useMemo, useState } from "react";
import Labeled from "./Labeled";
import { Formik, FormikErrors, FieldArray } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { IAccount } from "store/userdata/userdata.types";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  addAccount,
  deleteAccount,
  updateAccount,
} from "store/userdata/userdata.actions";
import { getById, getNextId } from "helpers/userdata";
import { SET_SELECTED_ACCOUNT } from "store/ui/ui.slice";
import { DatePickerField } from "./DatePickerField";
import "react-datepicker/dist/react-datepicker.css";
import { useTranslation } from "react-i18next";
import Hint from "./Hint";

const AccountAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { accounts, budgets, statements } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { selectedAccountId } = useSelector((state: AppState) => state.ui.ui);

  const defaultFormValues = useMemo(() => {
    return {
      id: 0,
      dateCreated: new Date(),
      name: "",
      leftFromPrevMonth: [],
    };
  }, []);

  const [formValues, setFormValues] = useState<IAccount>(defaultFormValues);

  const disableDelete = useMemo(
    () =>
      selectedAccountId !== undefined &&
      (budgets.findIndex(
        (b) =>
          b.fromAccountId === selectedAccountId ||
          b.toAccountId === selectedAccountId
      ) >= 0 ||
        statements.findIndex((s) => s.accountId === selectedAccountId) >= 0),
    [selectedAccountId, budgets, statements]
  );

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_ACCOUNT(undefined));
  };

  const onDeleteClick = () => {
    if (selectedAccountId && !disableDelete) {
      dispatch(deleteAccount(selectedAccountId));
    }
  };

  useEffect(() => {
    if (!selectedAccountId) {
      setFormValues(defaultFormValues);
      return;
    }

    let item = getById(accounts, selectedAccountId);
    if (!item) {
      return;
    }

    setFormValues({
      ...defaultFormValues,
      ...item,
    });
  }, [accounts, defaultFormValues, selectedAccountId]);

  return (
    <div>
      <Formik
        validateOnChange={true}
        enableReinitialize={true}
        initialValues={formValues}
        validate={(values) => {
          const errors: FormikErrors<IAccount> = {};

          if (!values.name) {
            errors.name = "errors.nameEmpty";
          }

          for (let value of values.leftFromPrevMonth) {
            if (value.month === null) {
              errors.leftFromPrevMonth = "errors.monthEmpty";
              break;
            }
          }

          return errors;
        }}
        onSubmit={(values) => {
          const account = {
            ...values,
          };

          if (values.id) {
            dispatch(updateAccount(account));
          } else {
            account.id = getNextId(accounts);
            dispatch(addAccount(account));
          }

          setFormValues(defaultFormValues);
          dispatch(SET_SELECTED_ACCOUNT(undefined));
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
              <Labeled
                labelKey="account.name"
                required
                errorKey={touched.name && errors.name ? errors.name : undefined}
              >
                <input
                  type="text"
                  id="name"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </Labeled>
            </div>
            <FieldArray
              name="leftFromPrevMonth"
              render={({ unshift, remove }) => (
                <div className="list-wrapper">
                  <Labeled
                    labelKey="account.leftFromPrevMonth"
                    horisontal={true}
                  >
                    <button
                      type="button"
                      className="small secondary"
                      onClick={() =>
                        unshift({ amount: "0", month: new Date() })
                      }
                    >
                      +
                    </button>
                  </Labeled>
                  <div className="list">
                    {errors.leftFromPrevMonth !== undefined &&
                      typeof errors.leftFromPrevMonth === "string" && (
                        <div className="error">
                          {t(errors.leftFromPrevMonth)}
                        </div>
                      )}
                    {values.leftFromPrevMonth?.map((amount, index) => (
                      <div key={index}>
                        <Labeled labelKey="account.month" required>
                          <DatePickerField
                            name={`leftFromPrevMonth[${index}].month`}
                          />
                        </Labeled>
                        <Labeled labelKey="account.amount">
                          <input
                            type="number"
                            name={`leftFromPrevMonth[${index}].amount`}
                            value={amount.amount}
                            onChange={handleChange}
                          />
                        </Labeled>
                        <button type="button" onClick={() => remove(index)}>
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
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
                    value={t("account.edit")}
                    disabled={!isValid}
                  />
                  <input
                    type="button"
                    className="btn small"
                    value={t("account.cancel")}
                    onClick={() => onCancelEditClick()}
                  />
                  <input
                    type="button"
                    className="btn small"
                    value={t("account.delete")}
                    onClick={() => onDeleteClick()}
                    disabled={disableDelete}
                  />
                  {disableDelete && (
                    <Hint label="?">{t("account.hintDeleteDisabled")}</Hint>
                  )}
                </>
              )}
              {!values.id && (
                <input
                  type="submit"
                  className="btn small primary"
                  value={t("account.add")}
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

export default AccountAddOrEdit;
