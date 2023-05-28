import { FC, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import { AppState } from "store/store";
import { CLEAR_TOAST_MESSAGES } from "store/ui/ui.slice";

const ToastMessages: FC = () => {
  const dispatch = useDispatch();
  const { messages } = useSelector((state: AppState) => state.ui);

  useEffect(() => {
    if (messages?.length) {
      messages.forEach((t) => {
        switch (t.appearance) {
          case "success": {
            toast.success(t.message, {
              style: {
                backgroundColor: "#d4edda",
                borderColor: "#c3e6cb",
                color: "#155724",
              },
            });
            break;
          }
          case "error":
            toast.error(t.message, {
              style: {
                backgroundColor: "#f8d7da",
                borderColor: "#f5c6cb",
                color: "#721c24",
              },
            });
            break;
        }
      });
      dispatch(CLEAR_TOAST_MESSAGES());
    }
  }, [dispatch, messages]);

  return (
    <ToastContainer
      autoClose={3000}
      position={toast.POSITION.BOTTOM_RIGHT}
      pauseOnHover={true}
    />
  );
};

export default ToastMessages;
