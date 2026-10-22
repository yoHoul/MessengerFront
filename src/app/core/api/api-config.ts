import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  baseUrl: string;
  useMockApi: boolean;
}

/**
 * Единственная точка переключения frontend между mock и реальным API.
 * Для backend-интеграции установить useMockApi: false и указать baseUrl.
 */
export const API_SETTINGS: ApiConfig = {
  baseUrl: '/api',
  useMockApi: true,
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  factory: () => API_SETTINGS,
});
