import { TAppThunk } from "store/store";
import { FETCHING, SET_FILTER } from "./ui.slice";
import { IUi } from "./ui.types";

export const fetchUi =
  (): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(FETCHING());

    const jsonString = localStorage.getItem("ui");
    const ui = (jsonString ? JSON.parse(jsonString) : {}) as IUi;

    dispatch(
      SET_FILTER(ui?.filter ?? { fromRelativeMonth: -2, toRelativeMonth: 5 })
    );
  };
