import React, { FunctionComponent } from "react";
import "./locales/i18n";
import "styles/global.scss";
import App from "./App";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "store/store";
import ErrorBoundary from "components/ErrorBoundary";
import { applyStoredTheme } from "helpers/themeHelper";

const Root: FunctionComponent = () => (
  <Provider store={store}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </Provider>
);

applyStoredTheme();

const container = document.getElementById("root");
createRoot(container!).render(<Root />);

