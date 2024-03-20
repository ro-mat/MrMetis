export interface IAmount {
  amount: string;
  fromAccountId: number;
  frequency: number;
  startDate: string;
  endDate?: string;
}
