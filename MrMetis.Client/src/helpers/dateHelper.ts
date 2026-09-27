import moment from "moment";

export const DATE_FORMAT = "YYYY-MM-DD";
export const DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ss";

// Before the start of the previous month, e.g. rows the forms hide by default.
export const isBeforePrevMonth = (date?: Date | string | null) =>
  !!date &&
  moment(date).isBefore(moment().subtract(1, "month").startOf("month"));
