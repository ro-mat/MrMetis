import React, { useEffect } from "react";
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
import { requiredError, requiredText } from "helpers/zodHelper";
import useAppForm from "hooks/useAppForm";
import { useFieldArray } from "react-hook-form";
import { DATE_FORMAT } from "helpers/dateHelper";
import moment from "moment";
import AddOrEditControls from "components/AddOrEditControls";

const schema = z.object({
  id: z.number().optional(),
  name: requiredText("errors.nameEmpty"),
  leftFromPrevMonth: z.array(
    z.object({
      month: z.date(requiredError("errors.monthEmpty")),
      amount: z.coerce.number(
        requiredError("errors.amountEmpty", "errors.NaN")
      ),
    })
  ),
});

type FormFields = z.output<typeof schema>;

const AccountAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();

  const {
    handleSubmit,
    reset,
    control,
    formState: { isValid },
  } = useAppForm(schema, accountAddOrEditFormDefault);

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

  const disableDelete =
    selectedAccountId !== undefined && isAccountUsed(selectedAccountId);

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
            name="name"
            control={control}
            label="account.name"
            required
          />
        </div>
        <div className="list-wrapper">
          <Field label="account.leftFromPrevMonth" horizontal>
            <Button onClick={() => prepend({ amount: 0, month: new Date() })}>
              +
            </Button>
          </Field>
          <div className="list">
            {fields.map((field, index) => (
              <div key={field.id}>
                <DateInput
                  name={`leftFromPrevMonth.${index}.month`}
                  control={control}
                  mode="month"
                  label="account.month"
                  required
                />
                <TextInput
                  name={`leftFromPrevMonth.${index}.amount`}
                  control={control}
                  type="number"
                  step="0.01"
                  label="account.amount"
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
