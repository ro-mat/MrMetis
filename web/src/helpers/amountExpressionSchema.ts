import { z } from "zod";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";
import { validateExpression } from "services/amountExpression";
import { requiredError } from "./zodHelper";

const accountId = z.number().int().optional();
const prevMonth = z.boolean().optional();

const amountTokenSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("number"),
    value: z.number(requiredError("errors.amountEmpty", "errors.NaN")),
  }),
  z.object({
    kind: z.literal("budget"),
    budgetId: z.number().int().positive("errors.expressionBudgetEmpty"),
    accountId,
    prevMonth,
  }),
  z.object({
    kind: z.literal("total"),
    budgetType: z.union([z.enum(BudgetTypeUser), z.enum(BudgetTypeExtra)]),
    accountId,
    prevMonth,
  }),
  z.object({ kind: z.literal("daysInMonth"), prevMonth }),
  z.object({
    kind: z.literal("weekdays"),
    weekday: z.literal([0, 1, 2, 3, 4, 5, 6]),
    prevMonth,
  }),
  z.object({
    kind: z.literal("operator"),
    operator: z.enum(["+", "-", "*", "/"]),
  }),
  z.object({ kind: z.literal("paren"), paren: z.enum(["(", ")"]) }),
]);

// Tokens that make a valid expression; with `numbersOnly` its values can
// only be numbers (e.g. overrides).
export const expressionSchema = (numbersOnly = false) =>
  z.array(amountTokenSchema).superRefine((tokens, ctx) => {
    const error = validateExpression(tokens, numbersOnly);
    if (error) {
      ctx.addIssue({ code: "custom", message: error });
    }
  });
