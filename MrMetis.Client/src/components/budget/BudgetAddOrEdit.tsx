import React, { useEffect, useMemo } from "react";
import Labeled from "components/Labeled";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  addBudget,
  deleteBudget,
  updateBudget,
} from "store/userdata/userdata.actions";
import { SET_SELECTED_BUDGET } from "store/ui/ui.slice";
import moment from "moment";
import { useTranslation } from "react-i18next";
import Hint from "components/Hint";
import useBudget from "hooks/useBudget";
import { budgetAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AddOrEditControls from "components/AddOrEditControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import useAccount from "hooks/useAccount";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DATE_FORMAT } from "helpers/dateHelper";

const schema = z
  .object({
    id: z.number().optional(),
    name: z.string({ required_error: "errors.nameEmpty" }),
    type: z.number({ required_error: "errors.typeEmpty" }),
    fromAccountId: z.number().optional(),
    toAccountId: z.number().optional(),
    expectOneStatement: z.boolean(),
    parentId: z.number().optional(),
    isEssential: z.boolean(),
    amounts: z.array(
      z.object({
        startDate: z.date({ required_error: "errors.dateEmpty" }),
        endDate: z.date().nullish(),
        fromAccountId: z.number({
          required_error: "errors.fromAccountEmpty",
        }),
        frequency: z.number({ required_error: "errors.frequencyEmpty" }),
        amount: z.string(),
      })
    ),
    overrides: z.array(
      z.object({
        month: z.date({ required_error: "errors.monthEmpty" }),
        accountId: z.number({ required_error: "errors.fromAccountEmpty" }),
        amount: z.number(),
      })
    ),
  })
  .refine((input) => {
    return (
      input.type !== BudgetTypeUser.transferToAccount || input.toAccountId !== 0
    );
  });

export type FormFields = z.infer<typeof schema>;

const BudgetAddOrEdit = () => {
  const { i18n, t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    control,
    formState: { errors, isValid },
  } = useForm<FormFields>({
    defaultValues: budgetAddOrEditFormDefault,
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const {
    fields: amountFields,
    prepend: prependAmount,
    remove: removeAmount,
  } = useFieldArray({
    control,
    name: "amounts",
  });

  const {
    fields: overrideFields,
    prepend: prependOverride,
    remove: removeOverride,
  } = useFieldArray({
    control,
    name: "overrides",
  });

  const onSubmit = (data: FormFields) => {
    const oldBudget = getBudgetById(selectedBudgetId)!;
    const budget = {
      ...oldBudget,
      ...data,
      amounts: data.amounts.map((a) => {
        return {
          ...a,
          startDate: moment(a.startDate).format(DATE_FORMAT),
          endDate: a.endDate
            ? moment(a.endDate).format(DATE_FORMAT)
            : undefined,
        };
      }),
      overrides: data.overrides.map((o) => {
        return {
          ...o,
          month: moment(o.month).format(DATE_FORMAT),
        };
      }),
    };

    if (data.id) {
      dispatch(updateBudget(budget));
    } else {
      budget.id = getNextBudgetId();
      dispatch(addBudget(budget));
    }

    reset();
    dispatch(SET_SELECTED_BUDGET(undefined));
  };

  const { selectedBudgetId } = useSelector((state: AppState) => state.ui.ui);

  const {
    budgets,
    getById: getBudgetById,
    getNextId: getNextBudgetId,
    isBudgetUsed,
  } = useBudget();
  const { accounts } = useAccount();

  const disableDelete = useMemo(
    () => selectedBudgetId !== undefined && isBudgetUsed(selectedBudgetId),
    [selectedBudgetId, isBudgetUsed]
  );

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_BUDGET(undefined));
  };

  const onDeleteClick = () => {
    if (selectedBudgetId && !disableDelete) {
      dispatch(deleteBudget(selectedBudgetId));
      dispatch(SET_SELECTED_BUDGET(undefined));
    }
  };

  useEffect(() => {
    if (!selectedBudgetId) {
      reset();
      return;
    }

    let item = getBudgetById(selectedBudgetId);
    if (!item) {
      return;
    }

    if (item.parentId) {
      const parent = getBudgetById(item.parentId);
      item = { ...item, fromAccountId: parent?.fromAccountId ?? 0 };
    }

    reset({
      ...budgetAddOrEditFormDefault,
      ...item,
      amounts: [...item.amounts]
        .map((a) => {
          return {
            ...a,
            startDate: moment(a.startDate).toDate(),
            endDate: a.endDate ? moment(a.endDate).toDate() : null,
          };
        })
        .sort((a, b) => moment(b.startDate).diff(moment(a.startDate))),
      overrides: [...item.overrides]
        .map((o) => {
          return {
            ...o,
            month: moment(o.month).toDate(),
          };
        })
        .sort((a, b) => moment(b.month).diff(moment(a.month))),
    });
  }, [reset, selectedBudgetId, getBudgetById]);

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="crud">
          <Labeled labelKey="budget.name" required>
            <input {...register("name")} type="text" />
          </Labeled>
          <Labeled labelKey="budget.type" required>
            <select {...register("type", { valueAsNumber: true })}>
              {[10, 20, 30, 40, 50, 60].map((i: number) => (
                <option key={i} value={i}>
                  {t(`budgetType.${BudgetTypeUser[i]}`)}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled labelKey="budget.parent">
            <select {...register("parentId", { valueAsNumber: true })}>
              <option value={0}>{t("general.no")}</option>
              {budgets
                .filter(
                  (b) => b.type === getValues().type && b.id !== getValues().id
                )
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </Labeled>
          <Labeled labelKey="budget.fromAccount">
            <select
              {...register("fromAccountId", { valueAsNumber: true })}
              disabled={!!getBudgetById(selectedBudgetId)?.fromAccountId}
            >
              <option value={0}>{t("general.no")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Labeled>
          {getValues().type === BudgetTypeUser.transferToAccount && (
            <Labeled labelKey="budget.toAccount" required>
              <select {...register("toAccountId", { valueAsNumber: true })}>
                <option value={0}>{t("general.no")}</option>
                {accounts
                  .filter((a) => a.id !== getValues().fromAccountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Labeled>
          )}
          <Labeled labelKey="budget.expectOneStatement">
            <input type="checkbox" {...register("expectOneStatement")} />
          </Labeled>
        </div>
        <div className="list-wrapper">
          <Labeled labelKey="budget.amounts" horisontal={true}>
            <button
              type="button"
              className="small secondary"
              onClick={() =>
                prependAmount({
                  amount: "0",
                  fromAccountId:
                    getValues().fromAccountId !== undefined
                      ? getValues().fromAccountId!
                      : 1,
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
            {amountFields.map((amount, index) => (
              <div key={index}>
                <Labeled labelKey="budget.startDate" required>
                  <Controller
                    name={`amounts.${index}.startDate`}
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        locale={i18n.language}
                        dateFormat="MM-yyyy"
                        selected={field.value ? new Date(field.value) : null}
                        onChange={(date) => field.onChange(date)}
                        showTimeSelect={false}
                        showMonthYearPicker
                        showTwoColumnMonthYearPicker
                      />
                    )}
                  />
                </Labeled>
                <Labeled labelKey="budget.endDate">
                  <Controller
                    name={`amounts.${index}.endDate`}
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        locale={i18n.language}
                        dateFormat="MM-yyyy"
                        selected={field.value ? new Date(field.value) : null}
                        onChange={(date) => field.onChange(date)}
                        showTimeSelect={false}
                        showMonthYearPicker
                        showTwoColumnMonthYearPicker
                      />
                    )}
                  />
                </Labeled>
                <Labeled labelKey="budget.fromAccount" required>
                  <select
                    {...register(`amounts.${index}.fromAccountId`, {
                      valueAsNumber: true,
                    })}
                    defaultValue={
                      getValues().fromAccountId
                        ? getValues().fromAccountId!
                        : amount.fromAccountId
                        ? amount.fromAccountId
                        : 1
                    }
                    disabled={!!getValues().fromAccountId}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled labelKey="budget.amount">
                  <input {...register(`amounts.${index}.amount`)} type="text" />
                </Labeled>
                <Labeled labelKey="budget.frequency" required>
                  <input
                    {...register(`amounts.${index}.frequency`, {
                      valueAsNumber: true,
                    })}
                    type="number"
                  />
                </Labeled>
                <div>
                  <button
                    type="button"
                    className="button"
                    onClick={() => removeAmount(index)}
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="list-wrapper">
          <Labeled labelKey="budget.overrides" horisontal={true}>
            <button
              type="button"
              className="small secondary"
              onClick={() =>
                prependOverride({
                  month: new Date(),
                  amount: 0,
                  accountId: 1,
                })
              }
            >
              +
            </button>
          </Labeled>
          <div className="list">
            {overrideFields.map((ovr, index) => (
              <div key={index}>
                <Labeled labelKey="budget.month" required>
                  <Controller
                    name={`overrides.${index}.month`}
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        locale={i18n.language}
                        dateFormat="MM-yyyy"
                        selected={
                          field.value ? moment(field.value).toDate() : null
                        }
                        onChange={(date) => field.onChange(date)}
                        showTimeSelect={false}
                        showMonthYearPicker
                        showTwoColumnMonthYearPicker
                      />
                    )}
                  />
                </Labeled>
                <Labeled labelKey="budget.fromAccount" required>
                  <select
                    {...register(`overrides.${index}.accountId`, {
                      valueAsNumber: true,
                    })}
                    defaultValue={
                      getValues().fromAccountId
                        ? getValues().fromAccountId!
                        : ovr.accountId
                        ? ovr.accountId
                        : 1
                    }
                    disabled={!!getValues().fromAccountId}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled labelKey="budget.amount">
                  <input
                    {...register(`overrides.${index}.amount`, {
                      valueAsNumber: true,
                    })}
                    type="number"
                  />
                </Labeled>
                <div>
                  <button type="button" onClick={() => removeOverride(index)}>
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <AddOrEditControls
          isNew={!selectedBudgetId}
          isValid={isValid}
          onCancelEditClick={onCancelEditClick}
          onDeleteClick={onDeleteClick}
          disableDelete={disableDelete}
        />
      </form>
    </div>
  );
};

export default BudgetAddOrEdit;
