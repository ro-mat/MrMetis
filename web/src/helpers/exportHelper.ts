import moment from "moment";
import { DATE_FORMAT } from "helpers/dateHelper";
import { csvCell } from "helpers/csvHelper";
import {
  BudgetTypeExtra,
  BudgetTypeUser,
  IUserdata,
} from "store/userdata/userdata.types";

// Marks every exported file as ours, so an import can recognize it.
export const APP_CODE = "mrmetis";

export const EXPORT_ENTITIES = [
  "statements",
  "budgets",
  "accounts",
  "preferences",
] as const;
export const EXPORT_FORMATS = ["csv", "json"] as const;
export type ExportEntity = (typeof EXPORT_ENTITIES)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
// everything in one json file (a backup), including the closed months
export const EXPORT_ALL = "all";
export type ExportChoice = ExportEntity | typeof EXPORT_ALL;

// How a column is written to a csv cell and read back: numbers and booleans as
// text, nested values as json, budget types by name; plain text otherwise.
type CellKind = "number" | "boolean" | "json" | "budgetType";

interface IColumn {
  key: string;
  kind?: CellKind;
  // not the item's own value, e.g. a name looked up
  get?: (item: Item, names: INames) => unknown;
}

type Item = Record<string, unknown>;
interface INames {
  accounts: Map<number, string>;
  budgets: Map<number, string>;
}

const column = (key: string, kind?: CellKind): IColumn => ({ key, kind });
const id = column("id", "number");
const dates = [column("dateCreated"), column("dateModified")];

// the csv columns after "app"; values stay raw (dates as DATE_FORMAT, "."
// decimals), not formatted with the preferences, so the file can be read back
export const EXPORT_COLUMNS: Record<ExportEntity, IColumn[]> = {
  statements: [
    id,
    column("date"),
    column("amount", "number"),
    column("comment"),
    column("accountId", "number"),
    {
      key: "account",
      get: (s, names) => names.accounts.get(s.accountId as number),
    },
    column("budgetId", "number"),
    {
      key: "budget",
      get: (s, names) => names.budgets.get(s.budgetId as number),
    },
    ...dates,
  ],
  budgets: [
    id,
    column("name"),
    column("type", "budgetType"),
    column("parentId", "number"),
    column("fromAccountId", "number"),
    column("toAccountId", "number"),
    column("isEssential", "boolean"),
    column("closeAfterOneStatement", "boolean"),
    column("amounts", "json"),
    column("overrides", "json"),
    column("closed", "json"),
    ...dates,
  ],
  accounts: [id, column("name"), column("leftFromPrevMonth", "json"), ...dates],
  // locale and currency as json, so a "" separator (none) stays apart from an
  // unset one (the country's)
  preferences: [
    column("language"),
    column("showLanguageInHeader", "boolean"),
    column("idleTimeoutMinutes", "number"),
    column("theme"),
    column("locale", "json"),
    column("currency", "json"),
  ],
};

const writeCell = (kind: CellKind | undefined, value: unknown) => {
  if (value === undefined) return undefined;
  if (kind === "json") return JSON.stringify(value);
  if (kind === "budgetType") {
    return BudgetTypeUser[value as number] ?? BudgetTypeExtra[value as number];
  }
  return value as string | number | boolean;
};

// back from what toCsv wrote; anything wrong is left to the import's schema
export const readCell = (kind: CellKind | undefined, cell: string): unknown => {
  if (cell === "") return undefined;
  switch (kind) {
    case "number":
      return Number(cell);
    case "boolean":
      return cell === "true" ? true : cell === "false" ? false : cell;
    case "json":
      try {
        return JSON.parse(cell);
      } catch {
        return cell;
      }
    case "budgetType":
      return (
        BudgetTypeUser[cell as keyof typeof BudgetTypeUser] ??
        BudgetTypeExtra[cell as keyof typeof BudgetTypeExtra] ??
        cell
      );
    default:
      return cell;
  }
};

// a list for every entity; the preferences are one item
const items = (userdata: IUserdata, entity: ExportEntity) =>
  entity === "preferences" ? [userdata.preferences] : userdata[entity];

export const toCsv = (userdata: IUserdata, entity: ExportEntity) => {
  const columns = EXPORT_COLUMNS[entity];
  const names: INames = {
    accounts: new Map(userdata.accounts.map((a) => [a.id, a.name])),
    budgets: new Map(userdata.budgets.map((b) => [b.id, b.name])),
  };
  const lines = (items(userdata, entity) as unknown as Item[]).map((item) =>
    [
      APP_CODE,
      ...columns.map((c) =>
        writeCell(c.kind, c.get ? c.get(item, names) : item[c.key])
      ),
    ]
      .map(csvCell)
      .join(",")
  );
  return [["app", ...columns.map((c) => c.key)].join(","), ...lines].join(
    "\r\n"
  );
};

export const toJson = (userdata: IUserdata, entity: ExportEntity) =>
  JSON.stringify(
    {
      app: APP_CODE,
      entity,
      exportedAt: new Date().toISOString(),
      items: items(userdata, entity),
    },
    undefined,
    2
  );

export const toJsonAll = (userdata: IUserdata) =>
  JSON.stringify(
    {
      app: APP_CODE,
      entity: EXPORT_ALL,
      exportedAt: new Date().toISOString(),
      data: {
        accounts: userdata.accounts,
        budgets: userdata.budgets,
        statements: userdata.statements,
        preferences: userdata.preferences,
        closedMonths: userdata.closedMonths,
      },
    },
    undefined,
    2
  );

const exportFileName = (entity: ExportChoice, format: ExportFormat) =>
  `${APP_CODE}-${entity}-${moment().format(DATE_FORMAT)}.${format}`;

// all data is json only, whatever `format` says
export const exportData = (
  userdata: IUserdata,
  entity: ExportChoice,
  format: ExportFormat
) => {
  if (entity === EXPORT_ALL) {
    const blob = new Blob([toJsonAll(userdata)], { type: "application/json" });
    downloadFile(blob, exportFileName(entity, "json"));
    return;
  }
  // the BOM makes Excel read the file as UTF-8 (e.g. Cyrillic names)
  const blob =
    format === "csv"
      ? new Blob(["\uFEFF", toCsv(userdata, entity)], {
          type: "text/csv;charset=utf-8",
        })
      : new Blob([toJson(userdata, entity)], { type: "application/json" });
  downloadFile(blob, exportFileName(entity, format));
};

export const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
