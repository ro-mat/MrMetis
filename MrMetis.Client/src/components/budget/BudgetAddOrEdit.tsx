import React, { useEffect, useState } from "react";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import {
  ADD_BUDGET,
  DELETE_BUDGET,
  UPDATE_BUDGET,
} from "store/userdata/userdata.slice";
import moment from "moment";
import { useTranslation } from "react-i18next";
import Hint from "components/Hint";
import useBudget from "hooks/useBudget";
import { budgetAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { requiredError, requiredText } from "helpers/zodHelper";
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
  OlderRowsToggle,
  RemoveButton,
  SelectBox,
  TextInput,
} from "components/ui";
import { DATE_FORMAT, isBeforePrevMonth } from "helpers/dateHelper";
import useOlderRows from "hooks/useOlderRows";
import useFormulaPreview from "hooks/useFormulaPreview";
import { getEnumArray } from "helpers/enumHelper";

const schema = z
  .object({
    id: z.number().optional(),
    name: requiredText("errors.nameEmpty"),
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
        frequency: z
          .number(requiredError("errors.frequencyEmpty", "errors.NaN"))
          .int("errors.frequencyInvalid")
          .min(1, "errors.frequencyInvalid"),
        // a formula, see the amount hint
        amount: requiredText("errors.amountEmpty"),
      }),
    ),
    overrides: z.array(
      z.object({
        month: z.date(requiredError("errors.monthEmpty")),
        accountId: z.number(requiredError("errors.fromAccountEmpty")),
        amount: z.number(requiredError("errors.amountEmpty", "errors.NaN")),
      }),
    ),
  })
  .refine(
    (input) =>
      input.type !== BudgetTypeUser.transferToAccount || !!input.toAccountId,
    { path: ["toAccountId"], message: "errors.toAccountEmpty" },
  )
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
      : budget,
  );

export type FormFields = z.output<typeof schema>;

interface IBudgetAddOrEditProps {
  // 0 for a new budget
  id: number;
  onClose: () => void;
}

const BudgetAddOrEdit = ({
  id: selectedBudgetId,
  onClose,
}: IBudgetAddOrEditProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isValid },
    validationErrors,
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

  // ended amounts and past overrides are hidden until asked for
  const olderAmounts = useOlderRows(amountFields, (a) =>
    isBeforePrevMonth(a.endDate),
  );
  const olderOverrides = useOlderRows(overrideFields, (o) =>
    isBeforePrevMonth(o.month),
  );
  const { setShowOlder: setShowOlderAmounts } = olderAmounts;
  const { setShowOlder: setShowOlderOverrides } = olderOverrides;

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
    onClose();
  };

  const { getById: getBudgetById, isBudgetUsed } = useBudget();

  // fields the rest of the form depends on
  const [id, type, fromAccountId, parentId] = useWatch({
    control,
    name: ["id", "type", "fromAccountId", "parentId"],
  });

  // the focused amount's formula evaluated for the current month
  const amounts = useWatch({ control, name: "amounts" });
  const [focusedAmount, setFocusedAmount] = useState<number>();
  const previewFormula = useFormulaPreview(focusedAmount !== undefined);
  const formatPreview = (formula?: string) => {
    const value = formula ? previewFormula(formula) : undefined;
    if (value === undefined) return undefined;
    if (typeof value === "string") return value;
    return isNaN(value) ? "?" : value.toFixed(2);
  };

  // a child of a budget with an account uses (and is locked to) that account
  const parentAccountId = getBudgetById(parentId)?.fromAccountId;
  useEffect(() => {
    if (parentAccountId && parentAccountId !== fromAccountId) {
      setValue("fromAccountId", parentAccountId, { shouldValidate: true });
    }
  }, [parentAccountId, fromAccountId, setValue]);

  const budgetTypeOptions = getEnumArray(BudgetTypeUser).map((i) => ({
    value: i,
    label: t(`budgetType.${BudgetTypeUser[i]}`),
  }));

  // While the budget has its own account, the row account selects show it
  // and are locked (the schema applies it on save).
  const rowAccountProps = fromAccountId
    ? { value: fromAccountId, disabled: true }
    : { control };

  const disableDelete = isBudgetUsed(selectedBudgetId);

  const onCancelEditClick = () => {
    onClose();
  };

  const onDeleteClick = () => {
    if (selectedBudgetId && !disableDelete) {
      dispatch(DELETE_BUDGET(selectedBudgetId));
      onClose();
    }
  };

  useEffect(() => {
    setShowOlderAmounts(false);
    setShowOlderOverrides(false);
    if (!selectedBudgetId) {
      reset();
      return;
    }

    let item = getBudgetById(selectedBudgetId);
    if (!item) {
      return;
    }

    const parent = getBudgetById(item.parentId);
    if (parent?.fromAccountId) {
      item = { ...item, fromAccountId: parent.fromAccountId };
    }

    // rows of a budget with its own account may not store one; they show
    // (and are saved with) the budget account, so let them validate as such
    const budgetAccountId = item.fromAccountId;

    reset({
      ...budgetAddOrEditFormDefault,
      ...item,
      amounts: [...item.amounts]
        .map((a) => {
          return {
            ...a,
            fromAccountId: budgetAccountId || a.fromAccountId,
            startDate: moment(a.startDate).toDate(),
            endDate: a.endDate ? moment(a.endDate).toDate() : null,
          };
        })
        .sort((a, b) => moment(b.startDate).diff(moment(a.startDate))),
      overrides: [...item.overrides]
        .map((o) => {
          return {
            ...o,
            accountId: budgetAccountId || o.accountId,
            month: moment(o.month).toDate(),
          };
        })
        .sort((a, b) => moment(b.month).diff(moment(a.month))),
    });
  }, [
    reset,
    selectedBudgetId,
    getBudgetById,
    setShowOlderAmounts,
    setShowOlderOverrides,
  ]);

  return (
    <div className="add-or-edit">
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
            disabled={!!parentAccountId}
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
              className="add"
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
            {olderAmounts.visibleRows.map(({ field, index }) => {
              const preview =
                index === focusedAmount
                  ? formatPreview(amounts?.[index]?.amount)
                  : undefined;
              return (
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
                  <div
                    className="amount-with-preview"
                    onFocus={() => setFocusedAmount(index)}
                    onBlur={() => setFocusedAmount(undefined)}
                  >
                    <TextInput
                      name={`amounts.${index}.amount`}
                      control={control}
                      label="budget.amount"
                      required
                    />
                    {preview !== undefined && (
                      <span className="formula-preview">
                        {t("budget.amountPreview", { value: preview })}
                      </span>
                    )}
                  </div>
                  <TextInput
                    name={`amounts.${index}.frequency`}
                    control={control}
                    className="frequency"
                    type="number"
                    label="budget.frequency"
                    required
                  />
                  <RemoveButton onClick={() => removeAmount(index)} />
                </div>
              );
            })}
          </div>
          <OlderRowsToggle
            hiddenCount={olderAmounts.hiddenCount}
            showOlder={olderAmounts.showOlder}
            onToggle={olderAmounts.toggleOlder}
          />
        </div>
        <div className="list-wrapper">
          <Field label="budget.overrides" horizontal>
            <Button
              className="add"
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
            {olderOverrides.visibleRows.map(({ field, index }) => (
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
                  required
                />
                <RemoveButton onClick={() => removeOverride(index)} />
              </div>
            ))}
          </div>
          <OlderRowsToggle
            hiddenCount={olderOverrides.hiddenCount}
            showOlder={olderOverrides.showOlder}
            onToggle={olderOverrides.toggleOlder}
          />
        </div>
        <AddOrEditControls
          isNew={!selectedBudgetId}
          isValid={isValid}
          validationErrors={validationErrors}
          onCancelEditClick={onCancelEditClick}
          onDeleteClick={onDeleteClick}
          deleteDisabledReason={
            disableDelete ? t("addOrEdit.budgetInUse") : undefined
          }
        />
      </form>
    </div>
  );
};

export default BudgetAddOrEdit;
