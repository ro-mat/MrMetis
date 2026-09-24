import React, { FunctionComponent, useEffect } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import Index from "pages/Index";
import StatementsPage from "pages/StatementsPage";
import LoginPage from "pages/LoginPage";
import BudgetPage from "pages/BudgetPage";
import AccountsPage from "pages/AccountsPage";
import { attempt, logout } from "store/auth/auth.actions";
import RegisterPage from "pages/RegisterPage";
import { loadUserdata, saveUserData } from "store/userdata/userdata.actions";
import { fetchUi } from "store/ui/ui.actions";
import SideNavLayout from "components/Layouts/SideNavLayout";
import FilterLayout from "components/Layouts/FilterLayout";
import Header from "components/Header";
import Footer from "components/Footer";
import Planning from "pages/planning/Index";
import Dashboard from "pages/Dashboard";
import PlanningAll from "pages/planning/PlanningAll";
import PlanningAccounts from "pages/planning/PlanningAccounts";
import Authenticated from "components/Authenticated";
import { useIdleTimer } from "react-idle-timer";
import UnAuthenticated from "components/UnAuthenticated";
import { selectIsAuthenticated } from "store/auth/auth.selectors";
import "moment/locale/ru";
import ToastMessages from "components/ToastMessages";
import RawDataEditor from "components/RawDataEditor";
import Privacy from "pages/Privacy";

const App: FunctionComponent = () => {
  const dispatch = useDispatch<TAppDispatch>();

  const { savePending } = useSelector((state: AppState) => state.data);
  const { isDemo } = useSelector((state: AppState) => state.auth);
  const authenticated = useSelector(selectIsAuthenticated);

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
  }, [dispatch]);

  useEffect(() => {
    if (authenticated || isDemo) {
      dispatch(loadUserdata());
    }
  }, [dispatch, authenticated, isDemo]);

  useEffect(() => {
    if (authenticated) {
      dispatch(fetchUi());
    }
  }, [dispatch, authenticated]);

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
              <Route path="/list" element={<StatementsPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
            </Route>
          </Route>

          <Route element={<UnAuthenticated />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Routes>
        <Footer />
      </Router>
    </>
  );
};

export default App;
