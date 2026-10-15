import { IBaseState } from "store/store";

export interface IUiState extends IBaseState {
  ui: IUi;
  messages: IToast[];
}

// pages with their own month range
export type FilterName = "planning" | "charts";

export interface IUi {
  filters: Record<FilterName, IFilter>;
  previewStatements: IStatementPreview;
}

export interface IFilter {
  fromRelativeMonth: number;
  toRelativeMonth: number;
}

export interface IStatementPreview {
  selectedPreviewStatements?: string;
}

export interface IToast {
  appearance: "success" | "error";
  message?: string;
}
