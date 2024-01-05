import { useSelector } from "react-redux";
import { AppState } from "store/store";

const useAccount = () => {
  const { accounts } = useSelector((state: AppState) => state.data.userdata);
  const getById = (accountId?: number) => {
    return accounts.find((a) => a.id === accountId);
  };

  return { accounts, getById };
};

export default useAccount;
