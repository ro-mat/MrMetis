import { useMemo } from "react";
import { DefaultValues, FieldValues, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// The form setup used everywhere: zod validation and errors shown once a
// field was touched. Form values are typed as the schema's input (what the
// fields hold), submitted values as its output (after coercion).
const useAppForm = <Input extends FieldValues, Output extends FieldValues>(
  schema: z.ZodType<Output, Input>,
  defaultValues: DefaultValues<Input>
) => {
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });

  // every current error (i18n keys), touched or not, e.g. to explain why the
  // form can't be submitted yet
  const values = useWatch({ control: form.control });
  const validationErrors = useMemo(() => {
    const result = schema.safeParse(values);
    return result.success
      ? []
      : [...new Set(result.error.issues.map((i) => i.message))];
  }, [schema, values]);

  return { ...form, validationErrors };
};

export default useAppForm;
