import { IHaveId } from "types/IHaveId";

export const nextId = (arr: IHaveId[]) =>
  arr.reduce((max, i) => Math.max(max, i.id), 0) + 1;

export const add = <T extends IHaveId>(arr: T[], obj: T) => {
  if (arr.find((i) => i.id === obj.id)) {
    console.error("Element with this id already exists");
    return;
  }
  arr.push(obj);
};

export const update = <T extends IHaveId>(arr: T[], obj: T) => {
  const index = arr.findIndex((i) => i.id === obj.id);
  if (index < 0) {
    console.error("Element with this id not found");
    return;
  }
  arr[index] = obj;
};

export const remove = <T extends IHaveId>(arr: T[], id: number) => {
  const index = arr.findIndex((i) => i.id === id);
  if (index >= 0) {
    arr.splice(index, 1);
  } else {
    console.error("Element with this id does not exists");
  }
};
