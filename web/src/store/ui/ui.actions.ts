import { TAppThunk } from "store/store";
import { FETCHING, SET_FILTER } from "./ui.slice";
import { FilterName, IFilter, IUi } from "./ui.types";

export const fetchUi =
  (): TAppThunk =>
  async (dispatch): Promise<void> => {
    dispatch(FETCHING());

    const jsonString = localStorage.getItem("ui");
    // stored before each page had its own range: one filter, for planning
    const ui = (jsonString ? JSON.parse(jsonString) : {}) as Partial<IUi> & {
      filter?: IFilter;
    };

    const stored: Record<FilterName, IFilter | undefined> = {
      planning: ui.filters?.planning ?? ui.filter,
      charts: ui.filters?.charts,
    };
    for (const [name, filter] of Object.entries(stored)) {
      dispatch(
        SET_FILTER({
          name: name as FilterName,
          filter: filter ?? { fromRelativeMonth: -2, toRelativeMonth: 5 },
        })
      );
    }
  };
