import { IUserdataDto } from "store/userdata/userdata.types";
import { closeSingleStatementPairs } from "services/budgetClosing";
import { getData } from "./demoData";

export const DemoDataKey = "demoData";

export const initDemoData = () => {
  // demo accounts leave out accountId of their left from previous month
  const data = { ...(getData() as unknown as IUserdataDto), closedMonths: [] };
  // the demo statements of budgets closing after one statement close them
  closeSingleStatementPairs(data);
  const demoDataStr = JSON.stringify(data);
  localStorage.setItem(DemoDataKey, demoDataStr);

  return JSON.parse(demoDataStr) as IUserdataDto;
};

export const clearDemoData = () => {
  localStorage.removeItem(DemoDataKey);
};

export const getDemoData = () => {
  const demoDataStr = localStorage.getItem(DemoDataKey)!;
  return JSON.parse(demoDataStr) as IUserdataDto;
};

export const saveDemoData = (data: IUserdataDto) => {
  const dataStr = JSON.stringify(data);
  localStorage.setItem(DemoDataKey, dataStr);
};
