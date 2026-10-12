import { z } from "zod";
import { parseCsv } from "helpers/csvHelper";
import {
  APP_CODE,
  EXPORT_COLUMNS,
  EXPORT_ENTITIES,
  ExportEntity,
} from "helpers/exportHelper";
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
  ...Object.values(BudgetTypeUser),
  ...Object.values(BudgetTypeExtra),
].filter((v) => typeof v === "number");

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
        amount: z.string(),
        fromAccountId: optional(id),
        frequency: z.number(),
        startDate: z.string(),
        endDate: optional(z.string()),
      })
    ),
    overrides: z.array(monthAmountPair).default([]),
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
};

const NUMBER_COLUMNS = [
  "id",
  "amount",
  "accountId",
  "budgetId",
  "parentId",
  "fromAccountId",
  "toAccountId",
];
const BOOLEAN_COLUMNS = ["isEssential", "closeAfterOneStatement"];
const JSON_COLUMNS = ["amounts", "overrides", "closed", "leftFromPrevMonth"];

// back from what toCsv wrote; anything wrong is left to the schema
const cellValue = (column: string, cell: string): unknown => {
  if (cell === "") return undefined;
  if (NUMBER_COLUMNS.includes(column)) return Number(cell);
  if (BOOLEAN_COLUMNS.includes(column)) {
    return cell === "true" ? true : cell === "false" ? false : cell;
  }
  if (JSON_COLUMNS.includes(column)) {
    try {
      return JSON.parse(cell);
    } catch {
      return cell;
    }
  }
  if (column === "type") {
    return (
      BudgetTypeUser[cell as keyof typeof BudgetTypeUser] ??
      BudgetTypeExtra[cell as keyof typeof BudgetTypeExtra] ??
      cell
    );
  }
  return cell;
};

const fromCsv = (text: string) => {
  const [header = [], ...rows] = parseCsv(text);
  const entity = EXPORT_ENTITIES.find(
    (e) => ["app", ...EXPORT_COLUMNS[e]].join() === header.join()
  );
  if (!entity || rows.some((r) => r[0] !== APP_CODE)) {
    throw new ImportError("preferences.importNotMrmetis");
  }
  const items = rows.map((row) =>
    Object.fromEntries(header.map((c, i) => [c, cellValue(c, row[i] ?? "")]))
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
    if (!parsed.success) {
      throw new ImportError("preferences.importInvalid");
    }
    return { entity, items: parsed.data } as Imported;
  },
};
