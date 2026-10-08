import moment from "moment";

export const DATE_FORMAT = "YYYY-MM-DD";
export const DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ss";

// Month and day names in the app's current language. A moment keeps the
// language it was created in, e.g. months memoized before a language switch.
export const formatInLanguage = (date: moment.MomentInput, pattern: string) =>
  moment(date).locale(moment.locale()).format(pattern);

// Before the start of the previous month, e.g. rows the forms hide by default.
export const isBeforePrevMonth = (date?: Date | string | null) =>
  !!date &&
  moment(date).isBefore(moment().subtract(1, "month").startOf("month"));
