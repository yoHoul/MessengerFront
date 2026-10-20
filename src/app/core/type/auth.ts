import { User } from './user';

export interface AuthCredentials {
  login: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface ProfileUpdate {
  displayName: string;
  username: string;
}
