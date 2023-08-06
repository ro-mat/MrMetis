export interface IAmount {
  amount: string;
  fromAccountId: number;
  amountType: AmountType;
  frequency: number;
  startDate: Date;
  endDate?: Date;
}

export enum AmountType {
  Basic,
  Rolling,
  Yearly,
}
