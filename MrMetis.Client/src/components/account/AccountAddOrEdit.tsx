import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { TAppDispatch } from "store/store";
import {
  ADD_ACCOUNT,
  DELETE_ACCOUNT,
  UPDATE_ACCOUNT,
} from "store/userdata/userdata.slice";
import {
  Button,
  DateInput,
  Field,
  OlderRowsToggle,
  RemoveButton,
  TextInput,
} from "components/ui";
import useAccount from "hooks/useAccount";
import { accountAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { requiredError, requiredText } from "helpers/zodHelper";
import useAppForm from "hooks/useAppForm";
import { useFieldArray } from "react-hook-form";
import { DATE_FORMAT, isBeforePrevMonth } from "helpers/dateHelper";
import useOlderRows from "hooks/useOlderRows";
import moment from "moment";
import AddOrEditControls from "components/AddOrEditControls";
import { useTranslation } from "react-i18next";

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

interface IAccountAddOrEditProps {
  // 0 for a new account
  id: number;
  onClose: () => void;
}

const AccountAddOrEdit = ({
  id: selectedAccountId,
  onClose,
}: IAccountAddOrEditProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<TAppDispatch>();

  const {
    handleSubmit,
    reset,
    control,
    formState: { isValid },
    validationErrors,
  } = useAppForm(schema, accountAddOrEditFormDefault);

  const { fields, prepend, remove } = useFieldArray({
    control,
    name: "leftFromPrevMonth",
  });
  const { visibleRows, hiddenCount, showOlder, toggleOlder, setShowOlder } =
    useOlderRows(fields, (f) => isBeforePrevMonth(f.month));

  const onSubmit = async (data: FormFields) => {
    const oldAccount = getAccountById(selectedAccountId)!;
    const account = {
      ...oldAccount,
      ...data,
      id: data.id ?? 0,
      leftFromPrevMonth: data.leftFromPrevMonth.map((l) => ({
        ...l,
        month: moment(l.month).format(DATE_FORMAT),
        accountId: selectedAccountId,
        amount: l.amount ?? 0,
      })),
    };

    if (account.id) {
      dispatch(UPDATE_ACCOUNT(account));
    } else {
      dispatch(ADD_ACCOUNT(account));
    }

    reset();
    onClose();
  };

  const { getById: getAccountById, isAccountUsed } = useAccount();

  const disableDelete = isAccountUsed(selectedAccountId);

  const onCancelEditClick = () => {
    onClose();
  };

  const onDeleteClick = () => {
    if (selectedAccountId && !disableDelete) {
      dispatch(DELETE_ACCOUNT(selectedAccountId));
      onClose();
    }
  };

  useEffect(() => {
    setShowOlder(false);
    if (!selectedAccountId) {
      reset();
      return;
    }

    const account = getAccountById(selectedAccountId);

    reset({
      ...accountAddOrEditFormDefault,
      ...account,
      leftFromPrevMonth: account?.leftFromPrevMonth
        .map((l) => ({
          ...l,
          month: new Date(l.month),
          amount: l.amount ?? 0,
        }))
        .sort((a, b) => moment(b.month).diff(moment(a.month))),
    });
  }, [selectedAccountId, reset, getAccountById, setShowOlder]);

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
            {visibleRows.map(({ field, index }) => (
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
          <OlderRowsToggle
            hiddenCount={hiddenCount}
            showOlder={showOlder}
            onToggle={toggleOlder}
          />
        </div>
        <AddOrEditControls
          isNew={!selectedAccountId}
          isValid={isValid}
          validationErrors={validationErrors}
          onCancelEditClick={onCancelEditClick}
          onDeleteClick={onDeleteClick}
          deleteDisabledReason={
            disableDelete ? t("addOrEdit.accountInUse") : undefined
          }
        />
      </form>
    </div>
  );
};

export default AccountAddOrEdit;
