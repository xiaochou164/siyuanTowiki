import type { ConfigRepository } from '../../infra/storage/config-repo.js';
import type { SecretStore } from '../../infra/security/secret-store.js';
import { FetchWikiApiClient } from '../../infra/api/wiki-api-client.js';
import type { ApiResult } from '../../shared/types.js';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  httpCode?: number;
}

export interface ConnectionProbeClient {
  checkConnection(): Promise<ApiResult<{ ok: true }>>;
  checkSpacesConnection(): Promise<ApiResult<{ ok: true }>>;
}

export class TestConnectionUseCase {
  constructor(
    private readonly configRepo: ConfigRepository,
    private readonly secretStore: SecretStore,
    private readonly createClient: (baseUrl: string, apiKey: string) => ConnectionProbeClient = (baseUrl, apiKey) =>
      new FetchWikiApiClient(baseUrl, apiKey)
  ) {}

  async execute(): Promise<ConnectionTestResult> {
    const config = await this.configRepo.get();
    if (!config) {
      return { success: false, message: 'Plugin config not found' };
    }

    const apiKey = this.secretStore.unseal(config.apiKeyEncrypted);
    const client = this.createClient(config.baseUrl, apiKey);
    const authResult = await client.checkConnection();

    if (authResult.ok) {
      return {
        success: true,
        message: 'Connection successful via /auth/me',
        httpCode: authResult.httpCode
      };
    }

    if (authResult.error.httpCode === 401) {
      return {
        success: false,
        message: 'Authentication failed: API Key is invalid or expired',
        httpCode: authResult.error.httpCode
      };
    }

    if (authResult.error.httpCode === 403) {
      return {
        success: false,
        message: 'Permission denied: API Key does not have access to this Wiki',
        httpCode: authResult.error.httpCode
      };
    }

    if (authResult.error.errorCode === 'NETWORK_ERROR') {
      return {
        success: false,
        message: `Network error: ${authResult.error.message}`,
        httpCode: authResult.error.httpCode
      };
    }

    const spacesResult = await client.checkSpacesConnection();
    if (spacesResult.ok) {
      return {
        success: true,
        message: 'Connection successful via /spaces',
        httpCode: spacesResult.httpCode
      };
    }

    return {
      success: false,
      message: `${spacesResult.error.errorCode}: ${spacesResult.error.message}`,
      httpCode: spacesResult.error.httpCode
    };
  }
}
