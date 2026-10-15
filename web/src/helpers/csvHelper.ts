type Cell = string | number | boolean | undefined;

export const csvCell = (value: Cell) => {
  if (value === undefined) {
    return "";
  }
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// Rows of cells; quoted cells may hold commas, quotes ("") and line breaks.
// A leading BOM and blank lines are dropped.
export const parseCsv = (text: string) => {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const endRow = () => {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
    row = [];
    cell = "";
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c !== '"') {
        cell += c;
      } else if (src[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      endRow();
    } else {
      cell += c;
    }
  }
  endRow();

  return rows;
};
