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
import { omit } from "lodash";
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
import useLocale from "hooks/useLocale";
import { expressionSchema } from "helpers/amountExpressionSchema";
import { AmountToken } from "types/IAmount";
import AmountExpressionEditor, {
  ExpressionPath,
} from "./AmountExpressionEditor";

const schema = z
  .object({
    id: z.number().optional(),
    name: requiredText("errors.nameEmpty"),
    type: z.number(requiredError("errors.typeEmpty")),
    fromAccountId: z.number().optional(),
    toAccountId: z.number().optional(),
    closeAfterOneStatement: z.boolean(),
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
        expression: expressionSchema(),
        // the formula stored before expressions, shown to rebuild it; not saved
        legacy: z.string().optional(),
      }),
    ),
    overrides: z.array(
      z.object({
        month: z.date(requiredError("errors.monthEmpty")),
        accountId: z.number(requiredError("errors.fromAccountEmpty")),
        expression: expressionSchema(true),
        // the amount stored before expressions, shown to rebuild it; not saved
        legacy: z.string().optional(),
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
export type FormInput = z.input<typeof schema>;

const zeroExpression = (): AmountToken[] => [{ kind: "number", value: 0 }];

// stored data from before expressions has a formula (or number) instead
const legacyOf = (row: object) =>
  "expression" in row || !("amount" in row) ? undefined : String(row.amount);

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
  const { formatAmount } = useLocale();
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
          ...omit(a, "legacy"),
          startDate: moment(a.startDate).format(DATE_FORMAT),
          endDate: a.endDate
            ? moment(a.endDate).format(DATE_FORMAT)
            : undefined,
        };
      }),
      overrides: data.overrides.map((o) => {
        return {
          ...omit(o, "legacy"),
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

  // the focused row's expression evaluated for the current month
  const [amounts, overrides] = useWatch({
    control,
    name: ["amounts", "overrides"],
  });
  const [focusedRow, setFocusedRow] = useState<ExpressionPath>();
  const previewExpression = useFormulaPreview(focusedRow !== undefined);
  const formatPreview = (expression?: AmountToken[]) => {
    const value = expression ? previewExpression(expression) : undefined;
    if (value === undefined) return undefined;
    if (typeof value === "string") return t(value);
    return isNaN(value) ? "?" : formatAmount(value);
  };
  const previewOf = (row: ExpressionPath, expression?: AmountToken[]) => {
    const preview = row === focusedRow ? formatPreview(expression) : undefined;
    return (
      preview !== undefined && (
        <span className="formula-preview">
          {t("budget.amountPreview", { value: preview })}
        </span>
      )
    );
  };
  // shows the row's preview while one of its fields has the focus
  const focusProps = (row: ExpressionPath) => ({
    onFocus: () => setFocusedRow(row),
    onBlur: () => setFocusedRow(undefined),
  });
  const legacyNote = (legacy?: string) =>
    legacy && (
      <span className="legacy">
        {t("budget.expression.legacy", { formula: legacy })}
      </span>
    );

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
            expression: a.expression ?? [],
            legacy: legacyOf(a),
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
            expression: o.expression ?? [],
            legacy: legacyOf(o),
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
            name="closeAfterOneStatement"
            control={control}
            label="budget.closeAfterOneStatement"
            horizontal={false}
          />
        </div>
        <div className="list-wrapper">
          <Field label="budget.amounts" horizontal>
            <Button
              className="add"
              onClick={() =>
                prependAmount({
                  expression: zeroExpression(),
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
              <p>{t("budget.amountHint.description")}</p>
            </Hint>
          </div>
          <div className="list">
            {olderAmounts.visibleRows.map(({ field, index }) => {
              const row: ExpressionPath = `amounts.${index}.expression`;
              return (
                <div key={field.id} className="sentence" {...focusProps(row)}>
                  <span>{t("budget.sentence.from")}</span>
                  <DateInput
                    name={`amounts.${index}.startDate`}
                    control={control}
                    mode="month"
                    ariaLabel={t("budget.startDate")}
                  />
                  <span>{t("budget.sentence.until")}</span>
                  <DateInput
                    name={`amounts.${index}.endDate`}
                    control={control}
                    mode="month"
                    ariaLabel={t("budget.endDate")}
                    placeholder={t("budget.sentence.noEnd")}
                  />
                  <span>{t("budget.sentence.onAccount")}</span>
                  <AccountSelect
                    name={`amounts.${index}.fromAccountId`}
                    {...rowAccountProps}
                    aria-label={t("budget.fromAccount")}
                  />
                  <span>{t("budget.sentence.every")}</span>
                  <TextInput
                    name={`amounts.${index}.frequency`}
                    control={control}
                    className="frequency"
                    type="number"
                    aria-label={t("budget.frequency")}
                  />
                  <span>{t("budget.sentence.months")}</span>
                  <AmountExpressionEditor
                    control={control}
                    name={row}
                    budgetId={id}
                  />
                  {previewOf(row, amounts?.[index]?.expression)}
                  {legacyNote(amounts?.[index]?.legacy)}
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
                  expression: zeroExpression(),
                  accountId: fromAccountId || 1,
                })
              }
            >
              +
            </Button>
          </Field>
          <div className="list">
            {olderOverrides.visibleRows.map(({ field, index }) => {
              const row: ExpressionPath = `overrides.${index}.expression`;
              return (
                <div key={field.id} className="sentence" {...focusProps(row)}>
                  <span>{t("budget.sentence.in")}</span>
                  <DateInput
                    name={`overrides.${index}.month`}
                    control={control}
                    mode="month"
                    ariaLabel={t("budget.month")}
                  />
                  <span>{t("budget.sentence.onAccount")}</span>
                  <AccountSelect
                    name={`overrides.${index}.accountId`}
                    {...rowAccountProps}
                    aria-label={t("budget.fromAccount")}
                  />
                  <span>{t("budget.sentence.amount")}</span>
                  <AmountExpressionEditor
                    control={control}
                    name={row}
                    numbersOnly
                  />
                  {previewOf(row, overrides?.[index]?.expression)}
                  {legacyNote(overrides?.[index]?.legacy)}
                  <RemoveButton onClick={() => removeOverride(index)} />
                </div>
              );
            })}
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
