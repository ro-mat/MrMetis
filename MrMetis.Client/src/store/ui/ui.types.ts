import { IBaseState } from "store/store";

export interface IUiState extends IBaseState {
  ui: IUi;
  messages: IToast[];
}

export interface IUi {
  filter: IFilter;
  selectedBudgetId?: number;
  selectedStatementId?: number;
  selectedAccountId?: number;
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
