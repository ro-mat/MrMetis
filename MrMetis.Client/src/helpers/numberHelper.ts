export const roundTo = (value: number, digits: number) => {
  if (!digits || digits < 0) {
    digits = 0;
  }

  const multiplicator = Math.pow(10, digits);
  const res = Math.round(value * multiplicator) / multiplicator;
  return res;
};
