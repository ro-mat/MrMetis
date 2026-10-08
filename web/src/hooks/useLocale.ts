import { useSelector } from "react-redux";
import { selectFormatter } from "store/userdata/userdata.selectors";

// Dates and amounts as the user's preferences say.
const useLocale = () => useSelector(selectFormatter);

export default useLocale;
