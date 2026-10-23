import { Observable } from 'rxjs';

import { AuthCredentials, AuthSession, ProfileUpdate } from '../type/auth';
import { User } from '../type/user';

export abstract class AuthApi {
  abstract login(credentials: AuthCredentials): Observable<AuthSession>;
  abstract register(credentials: AuthCredentials): Observable<AuthSession>;
  abstract me(token: string): Observable<User>;
  abstract updateProfile(token: string, profile: ProfileUpdate): Observable<User>;
  abstract changePassword(
    token: string,
    oldPassword: string,
    newPassword: string,
  ): Observable<void>;
  abstract logout(token: string): Observable<void>;
}
