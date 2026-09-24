import { DefaultValues, FieldValues, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// The form setup used everywhere: zod validation and errors shown once a
// field was touched. Form values are typed as the schema's input (what the
// fields hold), submitted values as its output (after coercion).
const useAppForm = <Input extends FieldValues, Output extends FieldValues>(
  schema: z.ZodType<Output, Input>,
  defaultValues: DefaultValues<Input>
) =>
  useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });

export default useAppForm;
