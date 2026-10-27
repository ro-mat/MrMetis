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
                backgroundColor: "var(--toast-success-bg)",
                borderColor: "var(--toast-success-border)",
                color: "var(--toast-success-text)",
              },
            });
            break;
          }
          case "error":
            toast.error(t.message, {
              style: {
                backgroundColor: "var(--toast-error-bg)",
                borderColor: "var(--toast-error-border)",
                color: "var(--toast-error-text)",
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
      position="bottom-right"
      pauseOnHover={true}
    />
  );
};

export default ToastMessages;
