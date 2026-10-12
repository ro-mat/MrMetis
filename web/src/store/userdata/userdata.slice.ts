import { createSlice } from "@reduxjs/toolkit";
import moment from "moment";
import { add, nextId, remove, update } from "helpers/userdata";
import { DATE_TIME_FORMAT } from "helpers/dateHelper";
import { defaultPreferences, withDefaults } from "helpers/localeHelper";
import {
  IAccount,
  IBudget,
  IPreferences,
  IStatement,
  IUserdata,
  IUserdataDto,
  IUserdataState,
  IStorageUsage,
} from "./userdata.types";
import { IAction } from "types/IAction";
import { Imported } from "helpers/importers";
import { IHaveMetadata } from "types/IHaveMetadata";
import { IMonthAmountPair } from "types/IMonthAmountPair";
import {
  closeBudget,
  closeMonth,
  isStatementLocked,
  migrateExpectOneStatement,
  openBudget,
  openMonth,
  recalculateClosed,
} from "services/budgetClosing";
import { recalculateClosedMonths } from "services/closedMonthsRecalculation";

export interface IBudgetClosingPayload {
  budgetId: number;
  // any day of the month, DATE_FORMAT
  month: string;
  // not set: every account
  accountId?: number;
}

export interface IMonthClosingPayload {
  month: string;
  // what is left on each account, stored for the next month
  left: IMonthAmountPair[];
}

const emptyUserdata = (): IUserdata => ({
  statements: [],
  budgets: [],
  accounts: [],
  preferences: defaultPreferences(),
  closedMonths: [],
});

const initialState: IUserdataState = {
  err: null,
  isFetching: false,
  savePending: false,
  loaded: false,
  saveFailed: false,
  userdata: emptyUserdata(),
};

const now = () => moment().format(DATE_TIME_FORMAT);

// Every add/update/delete marks the data as changed so App saves it.
const addItem = <T extends IHaveMetadata>(
  state: IUserdataState,
  list: T[],
  item: T
) => {
  add(list, { ...item, id: nextId(list), dateCreated: now() });
  state.savePending = true;
};

const updateItem = <T extends IHaveMetadata>(
  state: IUserdataState,
  list: T[],
  item: T
) => {
  update(list, { ...item, dateModified: now() });
  state.savePending = true;
};

// a budget closing after one statement closes once it gets one
const closeIfSingleStatement = (
  state: IUserdataState,
  statement: IStatement
) => {
  const budget = state.userdata.budgets.find(
    (b) => b.id === statement.budgetId
  );
  if (budget?.closeAfterOneStatement) {
    closeBudget(
      state.userdata,
      budget.id,
      statement.date,
      statement.accountId
    );
  }
};

const isSamePosition = (a: IStatement, b: IStatement) =>
  a.budgetId === b.budgetId &&
  a.accountId === b.accountId &&
  moment(a.date).isSame(moment(b.date), "M");

const removeItem = (
  state: IUserdataState,
  list: IHaveMetadata[],
  id: number
) => {
  remove(list, id);
  state.savePending = true;
};

const userdataSlice = createSlice({
  initialState,
  name: "userdata",
  reducers: {
    FETCHING: (state) => {
      state.isFetching = true;
    },
    ERROR: (state, action: IAction<string | null>) => {
      state.err = action.payload;
      state.isFetching = false;
    },
    SAVE_CHANGES: (state) => {
      state.savePending = true;
    },
    SAVED: (state) => {
      state.savePending = false;
    },
    SAVE_FAILED: (state) => {
      state.saveFailed = true;
    },
    SAVE_SUCCEEDED: (state) => {
      state.saveFailed = false;
    },
    SET_STORAGE: (state, action: IAction<IStorageUsage>) => {
      state.storage = action.payload;
    },

    SET_USERDATA: (state, action: IAction<Partial<IUserdataDto>>) => {
      const { statements, budgets, accounts, preferences, closedMonths } =
        action.payload;
      state.userdata = {
        statements: statements ?? [],
        budgets: budgets ?? [],
        accounts: accounts ?? [],
        preferences: withDefaults(preferences),
        closedMonths: closedMonths ?? [],
      };
      // save the converted data
      if (migrateExpectOneStatement(state.userdata)) {
        state.savePending = true;
      }
      state.loaded = true;
      state.isFetching = false;
    },
    CLEAR_USERDATA: (state) => {
      state.userdata = emptyUserdata();
      state.loaded = false;
      state.storage = undefined;
      state.saveFailed = false;
      state.isFetching = false;
    },

    UPDATE_PREFERENCES: (state, action: IAction<Partial<IPreferences>>) => {
      state.userdata.preferences = {
        ...state.userdata.preferences,
        ...action.payload,
      };
      state.savePending = true;
    },

    // statements of closed budgets and months can't change, the UI says why
    ADD_STATEMENT: (state, action: IAction<IStatement>) => {
      if (isStatementLocked(state.userdata, action.payload)) return;
      addItem(state, state.userdata.statements, action.payload);
      closeIfSingleStatement(state, action.payload);
    },
    UPDATE_STATEMENT: (state, action: IAction<IStatement>) => {
      const old = state.userdata.statements.find(
        (s) => s.id === action.payload.id
      );
      if (
        (old && isStatementLocked(state.userdata, old)) ||
        isStatementLocked(state.userdata, action.payload)
      )
        return;
      updateItem(state, state.userdata.statements, action.payload);
      if (!old || !isSamePosition(old, action.payload)) {
        closeIfSingleStatement(state, action.payload);
      }
    },
    DELETE_STATEMENT: (state, action: IAction<number>) => {
      const old = state.userdata.statements.find(
        (s) => s.id === action.payload
      );
      if (old && isStatementLocked(state.userdata, old)) return;
      removeItem(state, state.userdata.statements, action.payload);
    },

    CLOSE_BUDGET: (state, action: IAction<IBudgetClosingPayload>) => {
      const { budgetId, month, accountId } = action.payload;
      closeBudget(state.userdata, budgetId, month, accountId);
      state.savePending = true;
    },
    OPEN_BUDGET: (state, action: IAction<IBudgetClosingPayload>) => {
      const { budgetId, month, accountId } = action.payload;
      openBudget(state.userdata, budgetId, month, accountId);
      state.savePending = true;
    },
    CLOSE_MONTH: (state, action: IAction<IMonthClosingPayload>) => {
      closeMonth(state.userdata, action.payload.month, action.payload.left);
      state.savePending = true;
    },
    OPEN_MONTH: (state, action: IAction<string>) => {
      openMonth(state.userdata, action.payload);
      state.savePending = true;
    },

    // items from prepareImport (new ids, links checked)
    IMPORT_DATA: (state, { payload }: IAction<Imported>) => {
      const list: IHaveMetadata[] = state.userdata[payload.entity];
      list.push(...payload.items);
      if (payload.entity === "statements") {
        // also to closed budgets and months: their stored sums and what is
        // left after them follow
        const statements = payload.items;
        statements.forEach((s) => closeIfSingleStatement(state, s));
        recalculateClosed(state.userdata, statements);
        const first = statements.map((s) => s.date).sort()[0];
        try {
          if (first) recalculateClosedMonths(state.userdata, first);
        } catch {
          // a broken formula, shown on the budget pages; the left stays
        }
      }
      state.savePending = true;
    },

    ADD_BUDGET: (state, action: IAction<IBudget>) =>
      addItem(state, state.userdata.budgets, action.payload),
    UPDATE_BUDGET: (state, action: IAction<IBudget>) =>
      updateItem(state, state.userdata.budgets, action.payload),
    DELETE_BUDGET: (state, action: IAction<number>) =>
      removeItem(state, state.userdata.budgets, action.payload),

    ADD_ACCOUNT: (state, action: IAction<IAccount>) =>
      addItem(state, state.userdata.accounts, action.payload),
    UPDATE_ACCOUNT: (state, action: IAction<IAccount>) =>
      updateItem(state, state.userdata.accounts, action.payload),
    DELETE_ACCOUNT: (state, action: IAction<number>) =>
      removeItem(state, state.userdata.accounts, action.payload),
  },
});

export const {
  FETCHING,
  ERROR,
  SAVE_CHANGES,
  SAVED,
  SAVE_FAILED,
  SAVE_SUCCEEDED,
  SET_STORAGE,
  SET_USERDATA,
  CLEAR_USERDATA,
  UPDATE_PREFERENCES,
  ADD_STATEMENT,
  UPDATE_STATEMENT,
  DELETE_STATEMENT,
  CLOSE_BUDGET,
  OPEN_BUDGET,
  CLOSE_MONTH,
  OPEN_MONTH,
  IMPORT_DATA,
  ADD_BUDGET,
  UPDATE_BUDGET,
  DELETE_BUDGET,
  ADD_ACCOUNT,
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT,
} = userdataSlice.actions;

export default userdataSlice.reducer;
