export function getEnumArray<T extends Record<string, string | number>>(
  enumObject: T
) {
  return Object.keys(enumObject)
    .filter((item) => !isNaN(Number(item)))
    .map((item) => +item);
}
