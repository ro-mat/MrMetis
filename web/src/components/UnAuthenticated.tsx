import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { selectIsAuthenticated } from "store/auth/auth.selectors";

const UnAuthenticated = () => {
  const navigate = useNavigate();
  const authenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (authenticated) {
      navigate("/dashboard");
    }
  }, [authenticated, navigate]);

  return <Outlet />;
};

export default UnAuthenticated;
