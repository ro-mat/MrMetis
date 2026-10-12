import React from "react";
import { useTranslation } from "react-i18next";
import { get } from "lodash";
import {
  Control,
  Controller,
  FieldPath,
  useFieldArray,
  useFormState,
  useWatch,
} from "react-hook-form";
import {
  BudgetTypeExtra,
  BudgetTypeUser,
} from "store/userdata/userdata.types";
import { AmountOperator, AmountToken, AmountTokenKind } from "types/IAmount";
import { isValueToken, operatorSigns } from "services/amountExpression";
import { getEnumArray } from "helpers/enumHelper";
import useAmountTokenText from "hooks/useAmountTokenText";
import AccountSelect from "components/AccountSelect";
import BudgetSelect from "components/BudgetSelect";
import {
  AmountInput,
  Button,
  Menu,
  RemoveButton,
  SelectBox,
} from "components/ui";
import type { FormFields, FormInput } from "./BudgetAddOrEdit";

export type ExpressionPath =
  | `amounts.${number}.expression`
  | `overrides.${number}.expression`;

interface IAmountExpressionEditorProps {
  control: Control<FormInput, unknown, FormFields>;
  name: ExpressionPath;
  // only numbers can be added (e.g. overrides)
  numbersOnly?: boolean;
  // the budget being edited, it can't use itself
  budgetId?: number;
  // removes the whole row; shown with the add buttons
  onRemove: () => void;
}

const newValues: Record<
  Exclude<AmountTokenKind, "operator" | "paren">,
  AmountToken
> = {
  number: { kind: "number", value: 0 },
  budget: { kind: "budget", budgetId: 0 },
  total: { kind: "total", budgetType: BudgetTypeUser.spending },
  daysInMonth: { kind: "daysInMonth" },
  weekdays: { kind: "weekdays", weekday: 1 },
};

const operators: AmountOperator[] = ["+", "-", "*", "/"];

const totalTypes = [
  ...getEnumArray(BudgetTypeUser),
  BudgetTypeExtra.transferFromAccount,
  BudgetTypeExtra.leftFromPrevMonth,
  BudgetTypeExtra.openingBalance,
  BudgetTypeExtra.closingBalance,
  BudgetTypeExtra.monthDelta,
];

// An amount expression edited inline: a row of values, operators and
// parentheses; new ones are added at the end.
const AmountExpressionEditor = ({
  control,
  name,
  numbersOnly,
  budgetId,
  onRemove,
}: IAmountExpressionEditorProps) => {
  const { t } = useTranslation();
  const { typeLabel, weekdayNames } = useAmountTokenText();
  const { fields, append, remove } = useFieldArray({ control, name });
  const tokens = useWatch({ control, name });
  const { errors } = useFormState({ control, name });
  // errors of the whole expression, not of one of its values
  const error = get(errors, name)?.message ?? get(errors, name)?.root?.message;

  const path = (index: number, key: string) =>
    `${name}.${index}.${key}` as FieldPath<FormInput>;

  // "on all accounts" or "on <account>"
  const accountSelect = (index: number) => (
    <>
      <span>{t("budget.expression.on")}</span>
      <AccountSelect
        name={path(index, "accountId")}
        control={control}
        emptyOption="budget.expression.allAccounts"
        aria-label={t("budget.expression.account")}
      />
    </>
  );

  // "this month's" or "last month's", leading the value
  const monthSelect = (index: number) => (
    <Controller
      name={path(index, "prevMonth")}
      control={control}
      render={({ field }) => (
        <select
          ref={field.ref}
          name={field.name}
          aria-label={t("budget.expression.month")}
          value={field.value ? "prev" : "cur"}
          onChange={(e) => field.onChange(e.currentTarget.value === "prev")}
          onBlur={field.onBlur}
        >
          <option value="cur">{t("budget.expression.thisMonth")}</option>
          <option value="prev">{t("budget.expression.lastMonth")}</option>
        </select>
      )}
    />
  );

  const renderToken = (token: AmountToken | undefined, index: number) => {
    switch (token?.kind) {
      case "number":
        return (
          <AmountInput
            name={path(index, "value")}
            control={control}
            placeholder="0"
            aria-label={t("budget.expression.number")}
          />
        );
      case "budget":
        return (
          <>
            {monthSelect(index)}
            <BudgetSelect
              name={path(index, "budgetId")}
              control={control}
              filterable
              exclude={(b) => b.id === budgetId}
              aria-label={t("budget.expression.budget")}
            />
            {accountSelect(index)}
          </>
        );
      case "total":
        return (
          <>
            {monthSelect(index)}
            <SelectBox
              name={path(index, "budgetType")}
              control={control}
              options={totalTypes.map((type) => ({
                value: type,
                label: typeLabel(type),
              }))}
              aria-label={t("budget.expression.total")}
            />
            {accountSelect(index)}
          </>
        );
      case "daysInMonth":
        return (
          <>
            {monthSelect(index)}
            <span>{t("budget.expression.days")}</span>
          </>
        );
      case "weekdays":
        return (
          <>
            {monthSelect(index)}
            <SelectBox
              name={path(index, "weekday")}
              control={control}
              options={weekdayNames.map((day, i) => ({
                value: i,
                label: t("budget.expression.weekdaysOf", { day }),
              }))}
              aria-label={t("budget.expression.weekdays")}
            />
          </>
        );
      case "operator":
        return (
          <SelectBox
            name={path(index, "operator")}
            control={control}
            className="sign"
            options={operators.map((operator) => ({
              value: operator,
              label: operatorSigns[operator],
            }))}
            aria-label={t("budget.expression.operator.label")}
          />
        );
      case "paren":
        return <span className="sign">{token.paren}</span>;
    }
  };

  const valueMenuItems = (
    Object.keys(newValues) as (keyof typeof newValues)[]
  ).map((kind) => ({
    key: kind,
    label: t(`budget.expression.${kind}`),
    onClick: () => append(newValues[kind]),
  }));

  return (
    <div className="expression">
      {fields.map((field, index) => {
        const token = tokens?.[index];
        const isValue = token && isValueToken(token);
        return (
          <span
            key={field.id}
            className={isValue ? "token token-value" : "token"}
          >
            {renderToken(token, index)}
            <Button
              variant="plain"
              className="token-remove"
              aria-label={t("addOrEdit.delete")}
              onClick={() => remove(index)}
            >
              ×
            </Button>
          </span>
        );
      })}
      <span className="expression-add">
        {numbersOnly ? (
          <Button onClick={() => append(newValues.number)}>
            {t("budget.expression.addNumber")}
          </Button>
        ) : (
          <Menu
            trigger={t("budget.expression.addValue")}
            items={valueMenuItems}
          />
        )}
        {operators.map((operator) => (
          <Button
            key={operator}
            aria-label={t(`budget.expression.operator.${operator}`)}
            onClick={() => append({ kind: "operator", operator })}
          >
            {operatorSigns[operator]}
          </Button>
        ))}
        {(["(", ")"] as const).map((paren) => (
          <Button
            key={paren}
            onClick={() => append({ kind: "paren", paren })}
          >
            {paren}
          </Button>
        ))}
        <RemoveButton onClick={onRemove} />
      </span>
      {error && <span className="error">{t(error)}</span>}
    </div>
  );
};

export default AmountExpressionEditor;
