import { useEffect } from "react";
import Labeled from "../Labeled";
import DatePicker from "react-datepicker";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import {
  addStatement,
  deleteStatement,
  updateStatement,
} from "store/userdata/userdata.actions";
import { SET_SELECTED_STATEMENT } from "store/ui/ui.slice";
import "react-datepicker/dist/react-datepicker.css";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";
import useStatement from "hooks/useStatement";
import { statementAddOrEditFormDefault } from "helpers/constants/defaults";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AddOrEditControls from "components/AddOrEditControls";

const schema = z.object({
  id: z.number().optional(),
  amount: z.coerce.number({
    invalid_type_error: "errors.NaN",
    required_error: "errors.amountEmpty",
  }),
  date: z.date({ required_error: "errors.dateEmpty" }),
  budgetId: z.coerce.number({ required_error: "errors.budgetEmpty" }).int(),
  accountId: z.coerce.number({ required_error: "errors.accountEmpty" }).int(),
  comment: z.string().optional(),
});

type FormFields = z.infer<typeof schema>;

const StatementAddOrEdit = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { i18n } = useTranslation();

  const { budgets, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { selectedStatementId } = useSelector((state: AppState) => state.ui.ui);
  const { getById: getStatementById, getNextId: getNextStatementId } =
    useStatement();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormFields>({
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
      dispatch(updateStatement(st));
    } else {
      st.id = getNextStatementId();
      dispatch(addStatement(st));
    }

    reset(statementAddOrEditFormDefault);
    dispatch(SET_SELECTED_STATEMENT(undefined));
  };

  const onCancelEditClick = () => {
    dispatch(SET_SELECTED_STATEMENT(undefined));
  };

  const onDeleteClick = () => {
    if (selectedStatementId) {
      dispatch(deleteStatement(selectedStatementId));
      dispatch(SET_SELECTED_STATEMENT(undefined));
    }
  };

  useEffect(() => {
    if (!selectedStatementId) {
      reset();
      return;
    }

    let item = getStatementById(selectedStatementId);
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
          <Labeled
            labelKey="statement.amount"
            errorKey={errors.amount?.message}
            required
          >
            <input {...register("amount")} type="number" step="0.01" />
          </Labeled>
          <Labeled
            labelKey="statement.date"
            errorKey={errors.date?.message}
            required
          >
            <Controller
              control={control as any} //TODO: remove any and fix
              name={"date"}
              render={({ field }) => (
                <DatePicker
                  {...field}
                  locale={i18n.language}
                  selected={field.value ? new Date(field.value) : null}
                  onChange={(date) => field.onChange(date)}
                />
              )}
            />
          </Labeled>
          <Labeled
            labelKey="statement.budget"
            errorKey={errors.budgetId?.message}
            required
          >
            <select {...register("budgetId")}>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled
            labelKey="statement.account"
            errorKey={errors.accountId?.message}
            required
          >
            <select {...register("accountId")}>
              {accounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled
            labelKey="statement.comment"
            errorKey={errors.comment?.message}
          >
            <textarea {...register("comment")} />
          </Labeled>
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
