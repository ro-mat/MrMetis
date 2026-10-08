import { IHaveId } from "./IHaveId";

export interface IHaveMetadata extends IHaveId {
  dateCreated: string;
  dateModified?: string;
}
