import { DATE_FORMAT } from "helpers/dateHelper";
import moment from "moment";
import { BudgetTypeUser } from "store/userdata/userdata.types";

const loginFormDefault = {
  email: "",
  password: "",
};

const registerFormDefault = {
  email: "",
  password: "",
  invitationCode: "",
};

const budgetAddOrEditFormDefault = {
  id: 0,
  dateCreated: moment().format(DATE_FORMAT),
  parentId: 0,
  fromAccountId: 0,
  toAccountId: 0,
  name: "",
  isEssential: false,
  amounts: [],
  overrides: [],
  type: BudgetTypeUser.spending,
  expectOneStatement: false,
};

const statementAddOrEditFormDefault = {
  id: 0,
  dateCreated: moment().format(DATE_FORMAT),
  amount: 0,
  comment: "",
  date: moment().format(DATE_FORMAT),
  budgetId: 0,
  accountId: 0,
};

const accountAddOrEditFormDefault = {
  id: 0,
  dateCreated: moment().format(DATE_FORMAT),
  name: "",
  leftFromPrevMonth: [],
};

export {
  loginFormDefault,
  registerFormDefault,
  budgetAddOrEditFormDefault,
  statementAddOrEditFormDefault,
  accountAddOrEditFormDefault,
};
