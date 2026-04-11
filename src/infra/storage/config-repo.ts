export interface PluginConfig {
  baseUrl: string;
  apiKeyEncrypted: string;
  defaultVisibility: 'public' | 'private';
  defaultSpaceId?: number;
  contentOnlyUpdateEnabled: boolean;
  concurrency: number;
  retryTimes: number;
  deleteConfirmEnabled: boolean;
  dryRunEnabled: boolean;
}

export interface ConfigRepository {
  get(): Promise<PluginConfig | null>;
  save(config: PluginConfig): Promise<void>;
}

export class InMemoryConfigRepository implements ConfigRepository {
  private config: PluginConfig | null = null;

  async get(): Promise<PluginConfig | null> {
    return this.config;
  }

  async save(config: PluginConfig): Promise<void> {
    this.config = config;
  }
}
