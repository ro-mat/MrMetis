import { IHaveId } from "./IHaveId";

export interface IHaveMetadata extends IHaveId {
  dateCreated: Date;
  dateModified?: Date;
}
