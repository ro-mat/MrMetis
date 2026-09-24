import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  ADD_ACCOUNT,
  DELETE_ACCOUNT,
  UPDATE_ACCOUNT,
} from "store/userdata/userdata.slice";
import { SET_SELECTED_ACCOUNT } from "store/ui/ui.slice";
import {
  Button,
  DateInput,
  Field,
  RemoveButton,
  TextInput,
} from "components/ui";
import useAccount from "hooks/useAccount";
import { accountAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { requiredError } from "helpers/zodHelper";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { DATE_FORMAT } from "helpers/dateHelper";
import moment from "moment";
import AddOrEditControls from "components/AddOrEditControls";

const schema = z.object({
  id: z.number().optional(),
  name: z.string(requiredError("errors.nameEmpty")),
  leftFromPrevMonth: z.array(
    z.object({
      month: z.date(requiredError("errors.monthEmpty")),
      amount: z.coerce.number(
        requiredError("errors.amountEmpty", "errors.NaN")
      ),
    })
  ),
});

type FormInput = z.input<typeof schema>;
type FormFields = z.output<typeof schema>;

const AccountAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormInput, unknown, FormFields>({
    defaultValues: accountAddOrEditFormDefault,
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const { fields, prepend, remove } = useFieldArray({
    control,
    name: "leftFromPrevMonth",
  });

  const onSubmit = async (data: FormFields) => {
    const oldAccount = getAccountById(selectedAccountId)!;
    const account = {
      ...oldAccount,
      ...data,
      id: data.id ?? 0,
      leftFromPrevMonth: data.leftFromPrevMonth.map((l) => ({
        ...l,
        month: moment(l.month).format(DATE_FORMAT),
        accountId: selectedAccountId ?? 0,
        amount: l.amount ?? 0,
      })),
    };

    if (account.id) {
      dispatch(UPDATE_ACCOUNT(account));
    } else {
      dispatch(ADD_ACCOUNT(account));
    }

    reset();
    dispatch(SET_SELECTED_ACCOUNT(undefined));
  };

  const { selectedAccountId } = useSelector((state: AppState) => state.ui.ui);

  const { getById: getAccountById, isAccountUsed } = useAccount();

  const disableDelete = useMemo(
    () => selectedAccountId !== undefined && isAccountUsed(selectedAccountId),
    [selectedAccountId, isAccountUsed]
  );

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_ACCOUNT(undefined));
  };

  const onDeleteClick = () => {
    if (selectedAccountId && !disableDelete) {
      dispatch(DELETE_ACCOUNT(selectedAccountId));
      dispatch(SET_SELECTED_ACCOUNT(undefined));
    }
  };

  useEffect(() => {
    if (!selectedAccountId) {
      reset();
      return;
    }

    const account = getAccountById(selectedAccountId);

    reset({
      ...accountAddOrEditFormDefault,
      ...account,
      leftFromPrevMonth: account?.leftFromPrevMonth.map((l) => ({
        ...l,
        month: new Date(l.month),
        amount: l.amount ?? 0,
      })),
    });
  }, [selectedAccountId, reset, getAccountById]);

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="crud">
          <TextInput
            {...register("name")}
            label="account.name"
            required
            error={errors.name?.message}
          />
        </div>
        <div className="list-wrapper">
          <Field label="account.leftFromPrevMonth" horizontal>
            <Button onClick={() => prepend({ amount: 0, month: new Date() })}>
              +
            </Button>
          </Field>
          <div className="list">
            {fields.map((amount, index) => (
              <div key={index}>
                <DateInput
                  name={`leftFromPrevMonth.${index}.month`}
                  control={control}
                  mode="month"
                  label="account.month"
                  required
                  error={errors.leftFromPrevMonth?.[index]?.month?.message}
                />
                <TextInput
                  {...register(`leftFromPrevMonth.${index}.amount`)}
                  type="number"
                  step="0.01"
                  label="account.amount"
                  error={errors.leftFromPrevMonth?.[index]?.amount?.message}
                />
                <RemoveButton onClick={() => remove(index)} />
              </div>
            ))}
          </div>
        </div>
        <AddOrEditControls
          isNew={!selectedAccountId}
          isValid={isValid}
          onCancelEditClick={onCancelEditClick}
          onDeleteClick={onDeleteClick}
          disableDelete={disableDelete}
        />
      </form>
    </div>
  );
};

export default AccountAddOrEdit;
