import React, { useEffect, useMemo } from "react";
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
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  });

export type FormFields = z.infer<typeof schema>;

const BudgetAddOrEdit = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();

  const {
    register,
    handleSubmit,
    reset,
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

  // A budget-level account overrides the account of each amount/override row.
  const defaultAccountId = (rowAccountId?: number) =>
    fromAccountId || rowAccountId || 1;

  const disableDelete = useMemo(
    () => selectedBudgetId !== undefined && isBudgetUsed(selectedBudgetId),
    [selectedBudgetId, isBudgetUsed]
  );

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
            {...register("name")}
            label="budget.name"
            required
            error={errors.name?.message}
          />
          <SelectBox
            {...register("type", { valueAsNumber: true })}
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
            {...register("expectOneStatement")}
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
                  fromAccountId: fromAccountId ?? 1,
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
            {amountFields.map((amount, index) => (
              <div key={index}>
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
                  {...register(`amounts.${index}.fromAccountId`, {
                    valueAsNumber: true,
                  })}
                  label="budget.fromAccount"
                  required
                  defaultValue={defaultAccountId(amount.fromAccountId)}
                  disabled={!!fromAccountId}
                />
                <TextInput
                  {...register(`amounts.${index}.amount`)}
                  label="budget.amount"
                />
                <TextInput
                  {...register(`amounts.${index}.frequency`, {
                    valueAsNumber: true,
                  })}
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
                prependOverride({ month: new Date(), amount: 0, accountId: 1 })
              }
            >
              +
            </Button>
          </Field>
          <div className="list">
            {overrideFields.map((ovr, index) => (
              <div key={index}>
                <DateInput
                  name={`overrides.${index}.month`}
                  control={control}
                  mode="month"
                  label="budget.month"
                  required
                />
                <AccountSelect
                  {...register(`overrides.${index}.accountId`, {
                    valueAsNumber: true,
                  })}
                  label="budget.fromAccount"
                  required
                  defaultValue={defaultAccountId(ovr.accountId)}
                  disabled={!!fromAccountId}
                />
                <TextInput
                  {...register(`overrides.${index}.amount`, {
                    valueAsNumber: true,
                  })}
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
