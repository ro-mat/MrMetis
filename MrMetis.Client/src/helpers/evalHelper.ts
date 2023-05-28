import { Calculate } from "./budgetHelper";

export const calculate = (
  str: string,
  cur_month?: Calculate,
  prev_month?: Calculate
): number | string => {
  try {
    return roundTo(
      // eslint-disable-next-line no-new-func
      Function(
        "cur_month",
        "prev_month",
        `"use strict"; return (${str});`
      )(cur_month ?? new Calculate(), prev_month ?? new Calculate()),
      2
    );
  } catch (e) {
    if (typeof e === "string") {
      return e;
    } else if (e instanceof Error) {
      return e.message;
    }
    return "Unknown error";
  }
};

export const roundTo = (value: number, digits: number) => {
  if (!digits || digits < 0) {
    digits = 0;
  }

  const multiplicator = Math.pow(10, digits);
  const res = Math.round(value * multiplicator) / multiplicator;
  return res;
};
