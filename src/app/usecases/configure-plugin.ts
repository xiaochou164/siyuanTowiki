import type { ConfigRepository, PluginConfig } from '../../infra/storage/config-repo.js';
import type { SecretStore } from '../../infra/security/secret-store.js';

export interface ConfigurePluginInput {
  baseUrl: string;
  apiKey: string;
  defaultVisibility?: 'public' | 'private';
  defaultSpaceId?: number;
  contentOnlyUpdateEnabled?: boolean;
  concurrency?: number;
  retryTimes?: number;
  deleteConfirmEnabled?: boolean;
  dryRunEnabled?: boolean;
}

export class ConfigurePluginUseCase {
  constructor(private readonly configRepo: ConfigRepository, private readonly secretStore: SecretStore) {}

  async execute(input: ConfigurePluginInput): Promise<PluginConfig> {
    const config: PluginConfig = {
      baseUrl: input.baseUrl.replace(/\/$/, ''),
      apiKeyEncrypted: this.secretStore.seal(input.apiKey),
      defaultVisibility: input.defaultVisibility ?? 'public',
      defaultSpaceId: input.defaultSpaceId,
      contentOnlyUpdateEnabled: input.contentOnlyUpdateEnabled ?? false,
      concurrency: Math.max(1, input.concurrency ?? 1),
      retryTimes: Math.max(1, input.retryTimes ?? 3),
      deleteConfirmEnabled: input.deleteConfirmEnabled ?? true,
      dryRunEnabled: input.dryRunEnabled ?? false
    };

    await this.configRepo.save(config);
    return config;
  }
}
