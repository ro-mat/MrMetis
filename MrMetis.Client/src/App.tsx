import React, { FunctionComponent, useEffect, useMemo } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import Index from "views/Index";
import List from "views/List";
import Login from "views/Login";
import Budget from "views/Budget";
import Accounts from "views/Accounts";
import { attempt, logout } from "store/auth/auth.actions";
import Register from "views/Register";
import { fetchUserdata, saveUserData } from "store/userdata/userdata.actions";
import { fetchUi } from "store/ui/ui.actions";
import SideNavLayout from "components/Layouts/SideNavLayout";
import FilterLayout from "components/Layouts/FilterLayout";
import Header from "components/Header";
import Footer from "components/Footer";
import Planning from "views/Planning";
import Dashboard from "views/Dashboard";
import PlanningAll from "views/PlanningAll";
import PlanningAccounts from "views/PlanningAccounts";
import Authenticated from "components/Authenticated";
import { useIdleTimer } from "react-idle-timer";
import UnAuthenticated from "components/UnAuthenticated";
import { DemoDataKey, getDemoData } from "helpers/demoHelper";
import {
  SET_ACCOUNTS,
  SET_BUDGETS,
  SET_STATEMENTS,
} from "store/userdata/userdata.slice";
import { SET_ISDEMO } from "store/auth/auth.slice";
import "moment/locale/ru";
import ToastMessages from "components/ToastMessages";
import RawDataEditor from "components/RawDataEditor";
import Privacy from "views/Privacy";

const App: FunctionComponent = () => {
  const dispatch = useDispatch<TAppDispatch>();

  const { savePending } = useSelector((state: AppState) => state.data);
  const { token, user, isDemo } = useSelector((state: AppState) => state.auth);

  const authenticated = useMemo(() => !!token && !!user, [token, user]);

  const onIdle = () => {
    if (authenticated) {
      dispatch(logout());
    }
  };

  const { start, pause, reset } = useIdleTimer({
    onIdle,
    startManually: true,
    timeout: 600_000,
    throttle: 500,
  });

  useEffect(() => {
    if (!authenticated || isDemo) {
      reset();
      pause();
      return;
    }

    start();
  }, [authenticated, isDemo, start, pause, reset]);

  useEffect(() => {
    const storageToken = localStorage.getItem("token");
    if (storageToken) {
      dispatch(attempt(storageToken));
    }

    const demoData = localStorage.getItem(DemoDataKey);
    if (demoData) {
      dispatch(SET_ISDEMO(!!demoData));
    }
  }, [dispatch]);

  useEffect(() => {
    if (authenticated) {
      dispatch(fetchUserdata());
      dispatch(fetchUi());
    }
  }, [dispatch, authenticated]);

  useEffect(() => {
    if (isDemo) {
      const data = getDemoData();

      dispatch(SET_STATEMENTS(data.statements));
      dispatch(SET_BUDGETS(data.budgets));
      dispatch(SET_ACCOUNTS(data.accounts));
    }
  }, [dispatch, isDemo]);

  useEffect(() => {
    if (savePending) {
      dispatch(saveUserData());
    }
  }, [dispatch, savePending]);

  return (
    <>
      <Router>
        <ToastMessages />
        <RawDataEditor />
        <Header />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route element={<Authenticated />}>
            <Route element={<SideNavLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route element={<FilterLayout />}>
                <Route path="/planning" element={<Planning />}>
                  <Route path="/planning/all" element={<PlanningAll />} />
                  <Route
                    path="/planning/accounts"
                    element={<PlanningAccounts />}
                  />
                </Route>
              </Route>
              <Route path="/list" element={<List />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/accounts" element={<Accounts />} />
            </Route>
          </Route>

          <Route element={<UnAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        </Routes>
        <Footer />
      </Router>
    </>
  );
};

export default App;
