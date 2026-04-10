import type { ConfigRepository } from '../../infra/storage/config-repo.js';
import type { SecretStore } from '../../infra/security/secret-store.js';
import { FetchWikiApiClient } from '../../infra/api/wiki-api-client.js';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  httpCode?: number;
}

export class TestConnectionUseCase {
  constructor(private readonly configRepo: ConfigRepository, private readonly secretStore: SecretStore) {}

  async execute(): Promise<ConnectionTestResult> {
    const config = await this.configRepo.get();
    if (!config) {
      return { success: false, message: 'Plugin config not found' };
    }

    const apiKey = this.secretStore.unseal(config.apiKeyEncrypted);
    const client = new FetchWikiApiClient(config.baseUrl, apiKey);
    const result = await client.checkConnection();

    if (!result.ok) {
      return {
        success: false,
        message: `${result.error.errorCode}: ${result.error.message}`,
        httpCode: result.error.httpCode
      };
    }

    return { success: true, message: 'Connection successful', httpCode: result.httpCode };
  }
}
