export const roundTo = (value: number, digits: number) => {
  if (!digits || digits < 0) {
    digits = 0;
  }

  const multiplicator = Math.pow(10, digits);
  const res = Math.round(value * multiplicator) / multiplicator;
  return res;
};

const KB = 1024;
const MB = KB * 1024;

// Data size for people: "512 B", "12 KB", "1.5 MB" (1 MB = 1024 KB, as on the server)
export const formatBytes = (bytes: number) => {
  if (bytes < KB) {
    return `${bytes} B`;
  }
  if (bytes < MB) {
    return `${Math.round(bytes / KB)} KB`;
  }
  return `${roundTo(bytes / MB, 1)} MB`;
};
