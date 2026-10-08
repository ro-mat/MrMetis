import { IUserdataDto } from "store/userdata/userdata.types";
import { getData } from "./demoData";

export const DemoDataKey = "demoData";

export const initDemoData = () => {
  const demoDataStr = JSON.stringify(getData());
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
