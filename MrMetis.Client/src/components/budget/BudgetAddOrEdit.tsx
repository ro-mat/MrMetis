import React, { useEffect } from "react";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  ADD_BUDGET,
  DELETE_BUDGET,
  UPDATE_BUDGET,
} from "store/userdata/userdata.slice";
import { SET_SELECTED_BUDGET } from "store/ui/ui.slice";
import moment from "moment";
import { useTranslation } from "react-i18next";
import Hint from "components/Hint";
import useBudget from "hooks/useBudget";
import { budgetAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { requiredError } from "helpers/zodHelper";
import { useFieldArray, useWatch } from "react-hook-form";
import useAppForm from "hooks/useAppForm";
import AddOrEditControls from "components/AddOrEditControls";
import AccountSelect from "components/AccountSelect";
import BudgetSelect from "components/BudgetSelect";
import {
  Button,
  Checkbox,
  DateInput,
  Field,
  RemoveButton,
  SelectBox,
  TextInput,
} from "components/ui";
import { DATE_FORMAT } from "helpers/dateHelper";
import { getEnumArray } from "helpers/enumHelper";

const schema = z
  .object({
    id: z.number().optional(),
    name: z.string(requiredError("errors.nameEmpty")),
    type: z.number(requiredError("errors.typeEmpty")),
    fromAccountId: z.number().optional(),
    toAccountId: z.number().optional(),
    expectOneStatement: z.boolean(),
    parentId: z.number().optional(),
    isEssential: z.boolean(),
    amounts: z.array(
      z.object({
        startDate: z.date(requiredError("errors.dateEmpty")),
        endDate: z.date().nullish(),
        fromAccountId: z.number(requiredError("errors.fromAccountEmpty")),
        frequency: z.number(requiredError("errors.frequencyEmpty")),
        amount: z.string(),
      })
    ),
    overrides: z.array(
      z.object({
        month: z.date(requiredError("errors.monthEmpty")),
        accountId: z.number(requiredError("errors.fromAccountEmpty")),
        amount: z.number(),
      })
    ),
  })
  .refine((input) => {
    return (
      input.type !== BudgetTypeUser.transferToAccount || input.toAccountId !== 0
    );
  })
  // a budget-level account wins over the account chosen on each row
  .transform((budget) =>
    budget.fromAccountId
      ? {
          ...budget,
          amounts: budget.amounts.map((a) => ({
            ...a,
            fromAccountId: budget.fromAccountId!,
          })),
          overrides: budget.overrides.map((o) => ({
            ...o,
            accountId: budget.fromAccountId!,
          })),
        }
      : budget
  );

export type FormFields = z.output<typeof schema>;

const BudgetAddOrEdit = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();

  const {
    handleSubmit,
    reset,
    control,
    formState: { isValid },
  } = useAppForm(schema, budgetAddOrEditFormDefault);

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
      dispatch(UPDATE_BUDGET(budget));
    } else {
      dispatch(ADD_BUDGET(budget));
    }

    reset();
    dispatch(SET_SELECTED_BUDGET(undefined));
  };

  const { selectedBudgetId } = useSelector((state: AppState) => state.ui.ui);

  const { getById: getBudgetById, isBudgetUsed } = useBudget();

  // fields the rest of the form depends on
  const [id, type, fromAccountId] = useWatch({
    control,
    name: ["id", "type", "fromAccountId"],
  });

  const budgetTypeOptions = getEnumArray(BudgetTypeUser).map((i) => ({
    value: i,
    label: t(`budgetType.${BudgetTypeUser[i]}`),
  }));

  // While the budget has its own account, the row account selects show it
  // and are locked (the schema applies it on save).
  const rowAccountProps = fromAccountId
    ? { value: fromAccountId, disabled: true }
    : { control };

  const disableDelete =
    selectedBudgetId !== undefined && isBudgetUsed(selectedBudgetId);

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_BUDGET(undefined));
  };

  const onDeleteClick = () => {
    if (selectedBudgetId && !disableDelete) {
      dispatch(DELETE_BUDGET(selectedBudgetId));
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
          <TextInput
            name="name"
            control={control}
            label="budget.name"
            required
          />
          <SelectBox
            name="type"
            control={control}
            label="budget.type"
            required
            options={budgetTypeOptions}
          />
          <BudgetSelect
            name="parentId"
            control={control}
            filterable
            label="budget.parent"
            emptyOption="general.no"
            exclude={(b) => b.type !== type || b.id === id}
          />
          <AccountSelect
            name="fromAccountId"
            control={control}
            filterable
            label="budget.fromAccount"
            emptyOption="general.no"
            disabled={!!getBudgetById(selectedBudgetId)?.fromAccountId}
          />
          {type === BudgetTypeUser.transferToAccount && (
            <AccountSelect
              name="toAccountId"
              control={control}
              filterable
              label="budget.toAccount"
              required
              emptyOption="general.no"
              exclude={(a) => a.id === fromAccountId}
            />
          )}
          <Checkbox
            name="expectOneStatement"
            control={control}
            label="budget.expectOneStatement"
            horizontal={false}
          />
        </div>
        <div className="list-wrapper">
          <Field label="budget.amounts" horizontal>
            <Button
              onClick={() =>
                prependAmount({
                  amount: "0",
                  fromAccountId: fromAccountId || 1,
                  frequency: 1,
                  startDate: new Date(),
                })
              }
            >
              +
            </Button>
          </Field>
          <div>
            <Hint label={t("budget.amountHint.label")}>
              <pre>{t("budget.amountHint.description")}</pre>
            </Hint>
          </div>
          <div className="list">
            {amountFields.map((field, index) => (
              <div key={field.id}>
                <DateInput
                  name={`amounts.${index}.startDate`}
                  control={control}
                  mode="month"
                  label="budget.startDate"
                  required
                />
                <DateInput
                  name={`amounts.${index}.endDate`}
                  control={control}
                  mode="month"
                  label="budget.endDate"
                />
                <AccountSelect
                  name={`amounts.${index}.fromAccountId`}
                  {...rowAccountProps}
                  label="budget.fromAccount"
                  required
                />
                <TextInput
                  name={`amounts.${index}.amount`}
                  control={control}
                  label="budget.amount"
                />
                <TextInput
                  name={`amounts.${index}.frequency`}
                  control={control}
                  type="number"
                  label="budget.frequency"
                  required
                />
                <RemoveButton onClick={() => removeAmount(index)} />
              </div>
            ))}
          </div>
        </div>
        <div className="list-wrapper">
          <Field label="budget.overrides" horizontal>
            <Button
              onClick={() =>
                prependOverride({
                  month: new Date(),
                  amount: 0,
                  accountId: fromAccountId || 1,
                })
              }
            >
              +
            </Button>
          </Field>
          <div className="list">
            {overrideFields.map((field, index) => (
              <div key={field.id}>
                <DateInput
                  name={`overrides.${index}.month`}
                  control={control}
                  mode="month"
                  label="budget.month"
                  required
                />
                <AccountSelect
                  name={`overrides.${index}.accountId`}
                  {...rowAccountProps}
                  label="budget.fromAccount"
                  required
                />
                <TextInput
                  name={`overrides.${index}.amount`}
                  control={control}
                  type="number"
                  label="budget.amount"
                />
                <RemoveButton onClick={() => removeOverride(index)} />
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
