import { useState } from "react";

// Keyboard selection in a list of items with ids. When the chosen item is not
// in the list (or nothing is chosen) `preferredId` or the first item is
// selected instead; `move` wraps around.
const useListSelection = (items: { id: string }[], preferredId?: string) => {
  const [chosenId, setSelectedId] = useState("");

  const has = (id?: string) => items.some((i) => i.id === id);
  const selectedId = has(chosenId)
    ? chosenId
    : has(preferredId)
      ? preferredId!
      : (items[0]?.id ?? "");

  const move = (step: 1 | -1) => {
    const count = items.length;
    if (count === 0) return;

    const index = items.findIndex((i) => i.id === selectedId);
    setSelectedId(items[(index + step + count) % count].id);
  };

  return { selectedId, setSelectedId, move };
};

export default useListSelection;
