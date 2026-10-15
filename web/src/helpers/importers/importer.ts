import {
  IAccount,
  IBudget,
  IPreferences,
  IStatement,
} from "store/userdata/userdata.types";

// Items read from a file; their ids are only used to link items of the same
// file, each one gets a new id when added. Preferences are one item that
// replaces the current ones (missing values: the defaults).
export type Imported =
  | { entity: "statements"; items: IStatement[] }
  | { entity: "budgets"; items: IBudget[] }
  | { entity: "accounts"; items: IAccount[] }
  | { entity: "preferences"; items: Partial<IPreferences>[] };

// Reads the files of one app or bank.
export interface IImporter {
  // the source select's value
  source: string;
  // shown as is (a product name)
  label: string;
  // file types offered by the file picker
  accept: string;
  // throws an ImportError when the file can't be read
  parse: (text: string) => Imported;
}

// message is an i18n key
export class ImportError extends Error {}
