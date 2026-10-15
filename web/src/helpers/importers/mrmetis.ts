import { z } from "zod";
import { parseCsv } from "helpers/csvHelper";
import {
  APP_CODE,
  EXPORT_COLUMNS,
  EXPORT_ENTITIES,
  ExportEntity,
  readCell,
} from "helpers/exportHelper";
import {
  DATE_ORDERS,
  DATE_SEPARATORS,
  DECIMAL_SEPARATORS,
  THOUSANDS_SEPARATORS,
} from "helpers/localeHelper";
import { getEnumArray } from "helpers/enumHelper";
import { expressionSchema } from "helpers/amountExpressionSchema";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";
import { IImporter, Imported, ImportError } from "./importer";

// Checks what the app needs; stored data leaves out more than its types say
// (e.g. the account of an amount), or has null for it.
const optional = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform((v) => v ?? undefined);

const id = z.number().int();
const metadata = {
  id,
  dateCreated: optional(z.string()),
  dateModified: optional(z.string()),
};
const monthAmountPair = z.object({
  month: z.string(),
  amount: z.number(),
  accountId: optional(id),
});
const budgetTypes = [
  ...getEnumArray(BudgetTypeUser),
  ...getEnumArray(BudgetTypeExtra),
];

// unknown keys (e.g. the account name of a csv statement) are dropped
const SCHEMAS = {
  statements: z.object({
    ...metadata,
    amount: z.number(),
    comment: optional(z.string()),
    date: z.string(),
    budgetId: id,
    accountId: id,
  }),
  budgets: z.object({
    ...metadata,
    name: z.string(),
    parentId: optional(id),
    fromAccountId: optional(id),
    toAccountId: optional(id),
    isEssential: z.boolean().default(false),
    amounts: z.array(
      z.object({
        expression: expressionSchema(),
        fromAccountId: optional(id),
        frequency: z.number(),
        startDate: z.string(),
        endDate: optional(z.string()),
      })
    ),
    overrides: z
      .array(
        z.object({
          month: z.string(),
          accountId: optional(id),
          expression: expressionSchema(true),
        })
      )
      .default([]),
    type: z.number().refine((t) => budgetTypes.includes(t)),
    closeAfterOneStatement: z.boolean().default(false),
    closed: optional(
      z.array(
        z.object({ month: z.string(), accountId: id, actual: z.number() })
      )
    ),
  }),
  accounts: z.object({
    ...metadata,
    name: z.string(),
    leftFromPrevMonth: z.array(monthAmountPair).default([]),
  }),
  preferences: z.object({
    language: optional(z.string()),
    showLanguageInHeader: optional(z.boolean()),
    idleTimeoutMinutes: optional(z.number().int().positive()),
    theme: optional(z.enum(["auto", "light", "dark"])),
    locale: optional(
      z.object({
        country: z.string(),
        dateOrder: optional(z.enum(DATE_ORDERS)),
        dateSeparator: optional(z.enum(DATE_SEPARATORS)),
        decimalSeparator: optional(z.enum(DECIMAL_SEPARATORS)),
        thousandsSeparator: optional(z.enum(THOUSANDS_SEPARATORS)),
        firstDayOfWeek: optional(z.number().int().min(0).max(6)),
      })
    ),
    currency: optional(
      z.object({
        symbol: optional(z.string()),
        position: optional(z.enum(["before", "after"])),
        decimals: optional(z.union([z.literal(0), z.literal(2)])),
        negativeStyle: optional(z.enum(["minus", "parentheses"])),
      })
    ),
  }),
};

const fromCsv = (text: string) => {
  const [header = [], ...rows] = parseCsv(text);
  const entity = EXPORT_ENTITIES.find(
    (e) =>
      ["app", ...EXPORT_COLUMNS[e].map((c) => c.key)].join() === header.join()
  );
  if (!entity || rows.some((r) => r[0] !== APP_CODE)) {
    throw new ImportError("preferences.importNotMrmetis");
  }
  // the cells after "app"
  const items = rows.map((row) =>
    Object.fromEntries(
      EXPORT_COLUMNS[entity].map((c, i) => [
        c.key,
        readCell(c.kind, row[i + 1] ?? ""),
      ])
    )
  );
  return { entity, items };
};

const fromJson = (text: string) => {
  let data: { app?: unknown; entity?: unknown; items?: unknown };
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("preferences.importInvalid");
  }
  if (
    data?.app !== APP_CODE ||
    !EXPORT_ENTITIES.includes(data.entity as ExportEntity) ||
    !Array.isArray(data.items)
  ) {
    throw new ImportError("preferences.importNotMrmetis");
  }
  return { entity: data.entity as ExportEntity, items: data.items };
};

// Our own exports, csv or json (told apart by the content).
export const mrmetisImporter: IImporter = {
  source: APP_CODE,
  label: "MrMetis",
  accept: ".csv,.json",
  parse: (text) => {
    const { entity, items } = text
      .replace(/^\uFEFF/, "")
      .trimStart()
      .startsWith("{")
      ? fromJson(text)
      : fromCsv(text);
    const parsed = z.array(SCHEMAS[entity]).safeParse(items);
    if (
      !parsed.success ||
      (entity === "preferences" && parsed.data.length !== 1)
    ) {
      throw new ImportError("preferences.importInvalid");
    }
    return { entity, items: parsed.data } as Imported;
  },
};
