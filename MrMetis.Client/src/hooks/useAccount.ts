import { useSelector } from "react-redux";
import { AppState } from "store/store";

const useAccount = () => {
  const { accounts } = useSelector((state: AppState) => state.data.userdata);

  const getById = (accountId?: number) => {
    return accounts.find((a) => a.id === accountId);
  };

  const getNextId = () => {
    const maxExistingId =
      accounts.length > 0 ? Math.max(...accounts.map((i) => i.id)) : 0;
    return maxExistingId + 1;
  };

  return { accounts, getById, getNextId };
};

export default useAccount;
