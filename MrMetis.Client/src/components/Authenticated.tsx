import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { AppState } from "store/store";

const Authenticated = () => {
  const navigate = useNavigate();

  const { token, isDemo } = useSelector((state: AppState) => state.auth);

  useEffect(() => {
    if (!token && !isDemo) {
      navigate("/login");
    }
  }, [token, isDemo, navigate]);

  return <Outlet />;
};

export default Authenticated;
