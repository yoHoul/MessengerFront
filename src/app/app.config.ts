import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideOptimus } from '@openng/optimus-ui/config';
import { definePreset } from '@openng/optimus-ui-themes';
import Aura from '@openng/optimus-ui-themes/aura';

import { routes } from './app.routes';
import { API_CONFIG, API_SETTINGS } from './core/api/api-config';
import { AuthApi } from './core/api/auth-api';
import { ChatsApi } from './core/api/chats-api';
import { GroupInfoApi } from './core/api/group-info-api';
import { MessagesApi } from './core/api/messages-api';
import { AttachmentsApi } from './core/api/attachments-api';
import { UserDirectoryApi } from './core/api/user-directory-api';
import { authMockInterceptor } from './core/interceptors/auth-mock.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { AuthService } from './core/services/auth.service';
import { AuthApiService } from './core/services/auth-api.service';
import { AttachmentsApiService } from './core/services/attachments-api.service';
import { ChatsApiService } from './core/services/chats-api.service';
import { GroupInfoApiService } from './core/services/group-info-api.service';
import { MessagesApiService } from './core/services/messages-api.service';
import { UserProfileApiService } from './core/services/user-profile-api.service';
import { HttpAttachmentsApiService } from './core/api/http/http-attachments-api.service';
import { HttpChatsApiService } from './core/api/http/http-chats-api.service';
import { HttpGroupInfoApiService } from './core/api/http/http-group-info-api.service';
import { HttpMessagesApiService } from './core/api/http/http-messages-api.service';
import { HttpUserDirectoryApiService } from './core/api/http/http-user-directory-api.service';

const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

const apiProviders = API_SETTINGS.useMockApi
  ? [
      { provide: AuthApi, useExisting: AuthApiService },
      { provide: AttachmentsApi, useExisting: AttachmentsApiService },
      { provide: ChatsApi, useExisting: ChatsApiService },
      { provide: GroupInfoApi, useExisting: GroupInfoApiService },
      { provide: MessagesApi, useExisting: MessagesApiService },
      { provide: UserDirectoryApi, useExisting: UserProfileApiService },
    ]
  : [
      { provide: AuthApi, useExisting: AuthApiService },
      { provide: AttachmentsApi, useExisting: HttpAttachmentsApiService },
      { provide: ChatsApi, useExisting: HttpChatsApiService },
      { provide: GroupInfoApi, useExisting: HttpGroupInfoApiService },
      { provide: MessagesApi, useExisting: HttpMessagesApiService },
      { provide: UserDirectoryApi, useExisting: HttpUserDirectoryApiService },
    ];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    { provide: API_CONFIG, useValue: API_SETTINGS },
    provideHttpClient(
      withInterceptors(
        API_SETTINGS.useMockApi
          ? [authTokenInterceptor, authMockInterceptor]
          : [authTokenInterceptor],
      ),
    ),
    ...apiProviders,
    provideRouter(routes),
    provideOptimus({
      theme: {
        preset: AppPreset,
        options: { darkModeSelector: '.p-dark' },
      },
    }),
  ],
};
