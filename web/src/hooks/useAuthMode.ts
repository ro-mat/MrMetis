import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export type AuthMode = "account" | "local";

const AuthModeKey = "authMode";

// The last choice between a server account and an on-device profile, shared
// by the login and register pages. A link can pick one with ?mode=.
const useAuthMode = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const chosen =
      searchParams.get("mode") ?? localStorage.getItem(AuthModeKey);
    return chosen === "local" ? "local" : "account";
  });

  const changeMode = (value: AuthMode) => {
    localStorage.setItem(AuthModeKey, value);
    setMode(value);
  };

  return [mode, changeMode] as const;
};

export default useAuthMode;
