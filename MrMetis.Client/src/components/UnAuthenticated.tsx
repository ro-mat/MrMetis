import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { AppState } from "store/store";

const UnAuthenticated = () => {
  const navigate = useNavigate();

  const { token, user } = useSelector((state: AppState) => state.auth);

  const authenticated = useMemo(() => !!token && !!user, [token, user]);

  useEffect(() => {
    if (authenticated) {
      navigate("/dashboard");
    }
  }, [authenticated, navigate]);

  return <Outlet />;
};

export default UnAuthenticated;
