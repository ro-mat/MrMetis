import React, { FunctionComponent } from "react";
import "./locales/i18n";
import "styles/global.scss";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "store/store";
import "react-toastify/dist/ReactToastify.css";
import ErrorBoundary from "components/ErrorBoundary";

const Root: FunctionComponent = () => (
  <Provider store={store}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </Provider>
);

const container = document.getElementById("root");
createRoot(container!).render(<Root />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
