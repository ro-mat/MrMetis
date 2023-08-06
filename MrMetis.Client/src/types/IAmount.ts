export interface IAmount {
  amount: string;
  fromAccountId: number;
  frequency: number;
  startDate: Date;
  endDate?: Date;
}
