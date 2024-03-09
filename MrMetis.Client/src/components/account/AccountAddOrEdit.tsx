import React, { useEffect, useMemo } from "react";
import Labeled from "components/Labeled";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  addAccount,
  deleteAccount,
  updateAccount,
} from "store/userdata/userdata.actions";
import { SET_SELECTED_ACCOUNT } from "store/ui/ui.slice";
import { DatePickerField } from "components/DatePickerField";
import "react-datepicker/dist/react-datepicker.css";
import useAccount from "hooks/useAccount";
import { accountAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { DATE_FORMAT } from "helpers/dateHelper";
import moment from "moment";
import AddOrEditControls from "components/AddOrEditControls";

const schema = z.object({
  id: z.number().optional(),
  name: z.string({ required_error: "errors.nameEmpty" }),
  leftFromPrevMonth: z.array(
    z.object({
      month: z.date({ required_error: "errors.monthEmpty" }),
      amount: z.coerce.number({
        invalid_type_error: "errors.NaN",
        required_error: "errors.amountEmpty",
      }),
    })
  ),
});

type FormFields = z.infer<typeof schema>;

const AccountAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormFields>({
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
        accountId: selectedAccountId ?? 0,
        amount: l.amount ?? 0,
      })),
    };

    if (account.id) {
      dispatch(updateAccount(account));
    } else {
      account.id = getNextAccountId();
      dispatch(addAccount(account));
    }

    reset();
    dispatch(SET_SELECTED_ACCOUNT(undefined));
  };

  const { selectedAccountId } = useSelector((state: AppState) => state.ui.ui);

  const {
    getById: getAccountById,
    getNextId: getNextAccountId,
    isAccountUsed,
  } = useAccount();

  const disableDelete = useMemo(
    () => selectedAccountId !== undefined && isAccountUsed(selectedAccountId),
    [selectedAccountId, isAccountUsed]
  );

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_ACCOUNT(undefined));
  };

  const onDeleteClick = () => {
    if (selectedAccountId && !disableDelete) {
      dispatch(deleteAccount(selectedAccountId));
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
          <Labeled
            labelKey="account.name"
            required
            errorKey={errors.name?.message}
          >
            <input {...register("name")} type="text" />
          </Labeled>
        </div>
        <div className="list-wrapper">
          <Labeled labelKey="account.leftFromPrevMonth" horisontal={true}>
            <button
              type="button"
              className="small secondary"
              onClick={() =>
                prepend({
                  amount: 0,
                  month: new Date(),
                })
              }
            >
              +
            </button>
          </Labeled>
          <div className="list">
            {fields.map((amount, index) => (
              <div key={index}>
                <Labeled
                  labelKey="account.month"
                  errorKey={errors.leftFromPrevMonth?.[index]?.month?.message}
                  required
                >
                  <DatePickerField
                    name={`leftFromPrevMonth.${index}.month`}
                    control={control}
                  />
                </Labeled>
                <Labeled
                  labelKey="account.amount"
                  errorKey={errors.leftFromPrevMonth?.[index]?.amount?.message}
                >
                  <input
                    {...register(`leftFromPrevMonth.${index}.amount`)}
                    type="number"
                    step="0.01"
                  />
                </Labeled>
                <button type="button" onClick={() => remove(index)}>
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
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
