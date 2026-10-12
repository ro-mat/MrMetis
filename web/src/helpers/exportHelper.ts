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

export const EXPORT_ENTITIES = ["statements", "budgets", "accounts"] as const;
export const EXPORT_FORMATS = ["csv", "json"] as const;
export type ExportEntity = (typeof EXPORT_ENTITIES)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

type Row = Record<string, string | number | boolean | undefined>;

// nested lists don't fit a cell, so they stay JSON
const nested = (value: unknown[] | undefined) =>
  value === undefined ? undefined : JSON.stringify(value);

const budgetTypeName = (type: number) =>
  BudgetTypeUser[type] ?? BudgetTypeExtra[type] ?? type;

// Values stay raw (dates as DATE_FORMAT, "." decimals), not formatted with the
// preferences, so the file can be read back.
const rows = (userdata: IUserdata, entity: ExportEntity): Row[] => {
  switch (entity) {
    case "statements": {
      const accounts = new Map(userdata.accounts.map((a) => [a.id, a.name]));
      const budgets = new Map(userdata.budgets.map((b) => [b.id, b.name]));
      return userdata.statements.map((s) => ({
        id: s.id,
        date: s.date,
        amount: s.amount,
        comment: s.comment,
        accountId: s.accountId,
        account: accounts.get(s.accountId),
        budgetId: s.budgetId,
        budget: budgets.get(s.budgetId),
        dateCreated: s.dateCreated,
        dateModified: s.dateModified,
      }));
    }
    case "budgets":
      return userdata.budgets.map((b) => ({
        id: b.id,
        name: b.name,
        type: budgetTypeName(b.type),
        parentId: b.parentId,
        fromAccountId: b.fromAccountId,
        toAccountId: b.toAccountId,
        isEssential: b.isEssential,
        closeAfterOneStatement: b.closeAfterOneStatement,
        amounts: nested(b.amounts),
        overrides: nested(b.overrides),
        closed: nested(b.closed),
        dateCreated: b.dateCreated,
        dateModified: b.dateModified,
      }));
    case "accounts":
      return userdata.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        leftFromPrevMonth: nested(a.leftFromPrevMonth),
        dateCreated: a.dateCreated,
        dateModified: a.dateModified,
      }));
  }
};

// the csv columns after "app"
export const EXPORT_COLUMNS: Record<ExportEntity, string[]> = {
  statements: [
    "id",
    "date",
    "amount",
    "comment",
    "accountId",
    "account",
    "budgetId",
    "budget",
    "dateCreated",
    "dateModified",
  ],
  budgets: [
    "id",
    "name",
    "type",
    "parentId",
    "fromAccountId",
    "toAccountId",
    "isEssential",
    "closeAfterOneStatement",
    "amounts",
    "overrides",
    "closed",
    "dateCreated",
    "dateModified",
  ],
  accounts: ["id", "name", "leftFromPrevMonth", "dateCreated", "dateModified"],
};

export const toCsv = (userdata: IUserdata, entity: ExportEntity) => {
  const columns = EXPORT_COLUMNS[entity];
  const lines = rows(userdata, entity).map((row) =>
    [APP_CODE, ...columns.map((c) => row[c])].map(csvCell).join(",")
  );
  return [["app", ...columns].join(","), ...lines].join("\r\n");
};

export const toJson = (userdata: IUserdata, entity: ExportEntity) =>
  JSON.stringify(
    {
      app: APP_CODE,
      entity,
      exportedAt: new Date().toISOString(),
      items: userdata[entity],
    },
    undefined,
    2
  );

export const exportFileName = (entity: ExportEntity, format: ExportFormat) =>
  `${APP_CODE}-${entity}-${moment().format(DATE_FORMAT)}.${format}`;

export const exportData = (
  userdata: IUserdata,
  entity: ExportEntity,
  format: ExportFormat
) => {
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
