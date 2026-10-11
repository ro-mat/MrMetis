import { z } from "zod";

// zod 4 replaced required_error / invalid_type_error with a single error map
export const requiredError = (required: string, invalid?: string) => ({
  error: (issue: { input?: unknown }) =>
    issue.input === undefined ? required : invalid,
});

// Text that must be filled in (only whitespace counts as empty).
export const requiredText = (errorKey: string) =>
  z.string(requiredError(errorKey)).trim().min(1, errorKey);

// Id picked in a select; 0 is the "nothing selected" option.
export const requiredId = (errorKey: string) =>
  z.coerce.number(requiredError(errorKey)).int().positive(errorKey);
