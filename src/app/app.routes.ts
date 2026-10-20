import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';
import { LoginPage } from './pages/login-page/login-page';
import { MainPage } from './pages/main-page/main-page';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], component: LoginPage },
  { path: '', canActivate: [authGuard], component: MainPage },
  { path: '**', redirectTo: '' },
];
