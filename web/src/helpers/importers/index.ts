import { mrmetisImporter } from "./mrmetis";
import { IImporter } from "./importer";

export type { IImporter, Imported, ImportedAll } from "./importer";
export { ImportError } from "./importer";

// the sources offered on the preferences page, the first one preselected
export const IMPORTERS: IImporter[] = [mrmetisImporter];
