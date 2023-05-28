import { IBaseState } from "store/store";

export interface IUser {
  token?: string | null;
  user?: string | null;
}

export interface IAuthState extends IUser, IBaseState {
  isDemo: boolean;
}

export interface ICredentials {
  email?: string;
  password?: string;
  invitationCode?: string;
}
