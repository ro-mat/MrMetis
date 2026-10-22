import React from "react";
import { ToggleGroup } from "components/ui";
import { AuthMode } from "hooks/useAuthMode";

interface IAuthModeToggleProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

const AuthModeToggle = ({ mode, onChange }: IAuthModeToggleProps) => (
  <ToggleGroup
    className="auth-mode"
    items={[
      { value: "account", label: "login.modeAccount" },
      { value: "local", label: "login.modeLocal" },
    ]}
    value={mode}
    onChange={(value) => onChange(value as AuthMode)}
  />
);

export default AuthModeToggle;
