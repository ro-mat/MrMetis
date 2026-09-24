// zod 4 replaced required_error / invalid_type_error with a single error map
export const requiredError = (required: string, invalid?: string) => ({
  error: (issue: { input?: unknown }) =>
    issue.input === undefined ? required : invalid,
});
