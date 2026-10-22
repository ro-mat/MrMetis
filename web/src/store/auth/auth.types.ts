import { IBaseState } from "store/store";

export interface IUser {
  token?: string | null;
  user?: string | null;
}

export interface IAuthState extends IUser, IBaseState {
  isDemo: boolean;
  // on-device profile: no server, `user` is the profile name
  isLocal: boolean;
}

export interface ICredentials {
  email?: string;
  password?: string;
  invitationCode?: string;
}

export interface ILocalCredentials {
  name: string;
  password: string;
}

// Key derivation settings of the account, see api/MrMetis.Core/Kdf.cs
export interface IPrelogin {
  salt: string;
  iterations: number;
}

export interface IAuthResponse {
  token: string;
  wrappedKey: string;
}
