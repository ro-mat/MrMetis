import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  ADD_STATEMENT,
  DELETE_STATEMENT,
  UPDATE_STATEMENT,
} from "store/userdata/userdata.slice";
import { SET_SELECTED_STATEMENT } from "store/ui/ui.slice";
import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";
import useStatement from "hooks/useStatement";
import { statementAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { requiredError } from "helpers/zodHelper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AddOrEditControls from "components/AddOrEditControls";
import AccountSelect from "components/AccountSelect";
import BudgetSelect from "components/BudgetSelect";
import { DateInput, TextArea, TextInput } from "components/ui";

const schema = z.object({
  id: z.number().optional(),
  amount: z.coerce.number(requiredError("errors.amountEmpty", "errors.NaN")),
  date: z.date(requiredError("errors.dateEmpty")),
  budgetId: z.coerce.number(requiredError("errors.budgetEmpty")).int(),
  accountId: z.coerce.number(requiredError("errors.accountEmpty")).int(),
  comment: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormFields = z.output<typeof schema>;

const StatementAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { selectedStatementId } = useSelector((state: AppState) => state.ui.ui);
  const { getById: getStatementById } = useStatement();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormInput, unknown, FormFields>({
    defaultValues: statementAddOrEditFormDefault,
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit = (data: FormFields) => {
    const statement = getStatementById(selectedStatementId)!;
    const st = {
      ...statement,
      ...data,
      date: moment(data.date).format(DATE_FORMAT),
    };

    if (st.id) {
      dispatch(UPDATE_STATEMENT(st));
    } else {
      dispatch(ADD_STATEMENT(st));
    }

    reset(statementAddOrEditFormDefault);
    dispatch(SET_SELECTED_STATEMENT(undefined));
  };

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_STATEMENT(undefined));
  };

  const onDeleteClick = () => {
    if (selectedStatementId) {
      dispatch(DELETE_STATEMENT(selectedStatementId));
      dispatch(SET_SELECTED_STATEMENT(undefined));
    }
  };

  useEffect(() => {
    if (!selectedStatementId) {
      reset();
      return;
    }

    const item = getStatementById(selectedStatementId);
    if (!item) {
      return;
    }

    reset({
      ...statementAddOrEditFormDefault,
      ...item,
      date: moment(item.date).toDate(),
    });
  }, [selectedStatementId, getStatementById, reset]);

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="crud">
          <TextInput
            {...register("amount")}
            type="number"
            step="0.01"
            label="statement.amount"
            required
            error={errors.amount?.message}
          />
          <DateInput
            name="date"
            control={control}
            label="statement.date"
            required
            error={errors.date?.message}
          />
          <BudgetSelect
            name="budgetId"
            control={control}
            filterable
            label="statement.budget"
            required
            error={errors.budgetId?.message}
          />
          <AccountSelect
            name="accountId"
            control={control}
            filterable
            label="statement.account"
            required
            error={errors.accountId?.message}
          />
          <TextArea
            {...register("comment")}
            label="statement.comment"
            error={errors.comment?.message}
          />
        </div>
        <AddOrEditControls
          isNew={!selectedStatementId}
          onCancelEditClick={onCancelEditClick}
          onDeleteClick={onDeleteClick}
          isValid={isValid}
          disableDelete={false}
        />
      </form>
    </div>
  );
};

export default StatementAddOrEdit;
