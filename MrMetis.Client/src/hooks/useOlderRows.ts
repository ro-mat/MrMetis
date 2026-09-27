import useToggle from "hooks/useToggle";

// Splits the rows of a field array into the recent ones, shown by default, and
// older ones shown on request. Rows keep their index in the array, so field
// names and remove(index) still point at the right row.
const useOlderRows = <F>(fields: F[], isOlder: (field: F) => boolean) => {
  const [showOlder, toggleOlder, setShowOlder] = useToggle(false);

  const rows = fields.map((field, index) => ({ field, index }));
  const hiddenCount = rows.filter((r) => isOlder(r.field)).length;

  return {
    visibleRows: showOlder ? rows : rows.filter((r) => !isOlder(r.field)),
    hiddenCount,
    showOlder,
    toggleOlder,
    setShowOlder,
  };
};

export default useOlderRows;
