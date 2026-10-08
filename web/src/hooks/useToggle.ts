import { Dispatch, SetStateAction, useCallback, useState } from "react";

const useToggle = (
  initState?: boolean
): [boolean, () => void, Dispatch<SetStateAction<boolean>>] => {
  const [value, setValue] = useState(!!initState);

  const toggle = useCallback(() => setValue((x) => !x), []);

  return [value, toggle, setValue];
};

export default useToggle;
