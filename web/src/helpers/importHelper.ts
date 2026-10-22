import moment from "moment";
import { DATE_TIME_FORMAT } from "helpers/dateHelper";
import { nextId } from "helpers/userdata";
import { Imported } from "helpers/importers";
import {
  IAccount,
  IBudget,
  IStatement,
  IUserdata,
} from "store/userdata/userdata.types";

// "add": imported items are added, never overwrite: each one gets a new id.
// "overwrite": they replace every current item of their kind, ids as in the
// file.
export const IMPORT_MODES = ["add", "overwrite"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

// Adding: links within the file follow the new ids. Either way, links to
// other data (a statement's account and budget, a budget's accounts) must
// exist in the current data, items missing them are skipped; overwriting
// budgets, a parent must be in the file too. Statements are added to closed
// months and budgets too (an import restores what was there), see IMPORT_DATA.
export const prepareImport = (
  userdata: IUserdata,
  imported: Imported,
  mode: ImportMode = "add"
): { prepared: Imported; skipped: number } => {
  const overwrite = mode === "overwrite";
  const now = moment().format(DATE_TIME_FORMAT);
  const added = { dateCreated: now, dateModified: undefined };
  const accountIds = new Set(userdata.accounts.map((a) => a.id));
  const budgetIds = new Set(userdata.budgets.map((b) => b.id));

  const withNewIds = <T extends { id: number }>(items: T[], existing: T[]) => {
    if (overwrite) {
      return { ids: new Map(items.map((item) => [item.id, item.id])), items };
    }
    const first = nextId(existing);
    const ids = new Map(items.map((item, i) => [item.id, first + i]));
    return {
      ids,
      items: items.map((item, i) => ({ ...item, ...added, id: first + i })),
    };
  };

  switch (imported.entity) {
    case "statements": {
      const valid = imported.items.filter(
        (s) => accountIds.has(s.accountId) && budgetIds.has(s.budgetId)
      );
      const { items } = withNewIds<IStatement>(valid, userdata.statements);
      return {
        prepared: { entity: "statements", items },
        skipped: imported.items.length - valid.length,
      };
    }
    case "budgets": {
      const inFile = new Set(imported.items.map((b) => b.id));
      const valid = imported.items.filter(
        (b) =>
          // 0 or none: no account
          (!b.toAccountId || accountIds.has(b.toAccountId)) &&
          (!b.fromAccountId || accountIds.has(b.fromAccountId))
      );
      const { ids, items } = withNewIds<IBudget>(valid, userdata.budgets);
      // a parent from the file follows its new id (none when it was skipped);
      // overwriting, the current budgets are gone
      const parentId = (id?: number) => {
        if (!id) return id;
        if (inFile.has(id)) return ids.get(id);
        return !overwrite && budgetIds.has(id) ? id : undefined;
      };
      return {
        prepared: {
          entity: "budgets",
          items: items.map((b) => ({ ...b, parentId: parentId(b.parentId) })),
        },
        skipped: imported.items.length - valid.length,
      };
    }
    // a backup, its links are its own; only ever overwrites (see DataImport)
    case "all":
    case "preferences":
      return { prepared: imported, skipped: 0 };
    case "accounts": {
      const { ids, items } = withNewIds<IAccount>(
        imported.items,
        userdata.accounts
      );
      return {
        prepared: {
          entity: "accounts",
          items: items.map((a) => ({
            ...a,
            leftFromPrevMonth: a.leftFromPrevMonth.map((l) =>
              l.accountId === undefined
                ? l
                : { ...l, accountId: ids.get(l.accountId) ?? l.accountId }
            ),
          })),
        },
        skipped: 0,
      };
    }
  }
};
