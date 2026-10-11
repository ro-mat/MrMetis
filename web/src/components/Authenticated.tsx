import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { selectHasSession } from "store/auth/auth.selectors";

const Authenticated = () => {
  const navigate = useNavigate();
  const hasSession = useSelector(selectHasSession);

  useEffect(() => {
    if (!hasSession) {
      navigate("/login");
    }
  }, [hasSession, navigate]);

  return <Outlet />;
};

export default Authenticated;
