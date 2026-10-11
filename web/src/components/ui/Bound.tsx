import React, { ReactElement } from "react";
import {
  Control,
  Controller,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";

// Props that connect a control to a react-hook-form form.
export interface IBindProps<T extends FieldValues> {
  name?: FieldPath<T>;
  control?: Control<T, unknown, FieldValues>;
}

export type IFormField = ControllerRenderProps<FieldValues, string>;

interface IBoundProps<T extends FieldValues> extends IBindProps<T> {
  // `field` and `error` are only set when bound to a form
  children: (field: IFormField | undefined, error?: string) => ReactElement;
}

// The one place every ui control connects to the form: with `name` and
// `control` it renders through a Controller (value, onChange and the
// validation error come from the form), otherwise it renders unbound.
const Bound = <T extends FieldValues>({
  name,
  control,
  children,
}: IBoundProps<T>) =>
  name && control ? (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) =>
        children(field as IFormField, fieldState.error?.message)
      }
    />
  ) : (
    children(undefined)
  );

export default Bound;
