import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryConfigRepository } from '../dist/infra/storage/config-repo.js';
import { SimpleSecretStore } from '../dist/infra/security/secret-store.js';
import { TestConnectionUseCase } from '../dist/app/usecases/test-connection.js';

async function createConfiguredRepo() {
  const configRepo = new InMemoryConfigRepository();
  const secretStore = new SimpleSecretStore();

  await configRepo.save({
    baseUrl: 'https://wiki.local/api/v1',
    apiKeyEncrypted: secretStore.seal('token'),
    defaultVisibility: 'public',
    contentOnlyUpdateEnabled: false,
    concurrency: 1,
    retryTimes: 3,
    deleteConfirmEnabled: true,
    dryRunEnabled: false
  });

  return { configRepo, secretStore };
}

test('test connection falls back to /spaces when /auth/me is unavailable', async () => {
  const { configRepo, secretStore } = await createConfiguredRepo();
  const useCase = new TestConnectionUseCase(configRepo, secretStore, () => ({
    async checkConnection() {
      return {
        ok: false,
        error: {
          httpCode: 404,
          errorCode: 'HTTP_404',
          message: 'Wiki API request failed: 404',
          retriable: false
        }
      };
    },
    async checkSpacesConnection() {
      return { ok: true, data: { ok: true }, httpCode: 200 };
    }
  }));

  const result = await useCase.execute();
  assert.equal(result.success, true);
  assert.equal(result.message, 'Connection successful via /spaces');
});

test('test connection returns clear message for 401 and skips fallback', async () => {
  const { configRepo, secretStore } = await createConfiguredRepo();
  const useCase = new TestConnectionUseCase(configRepo, secretStore, () => ({
    async checkConnection() {
      return {
        ok: false,
        error: {
          httpCode: 401,
          errorCode: 'HTTP_401',
          message: 'Wiki API request failed: 401',
          retriable: false
        }
      };
    },
    async checkSpacesConnection() {
      throw new Error('fallback should not be called');
    }
  }));

  const result = await useCase.execute();
  assert.equal(result.success, false);
  assert.equal(result.httpCode, 401);
  assert.match(result.message, /invalid or expired/i);
});

test('test connection returns clear message for network errors', async () => {
  const { configRepo, secretStore } = await createConfiguredRepo();
  const useCase = new TestConnectionUseCase(configRepo, secretStore, () => ({
    async checkConnection() {
      return {
        ok: false,
        error: {
          httpCode: 0,
          errorCode: 'NETWORK_ERROR',
          message: 'fetch failed',
          retriable: true
        }
      };
    },
    async checkSpacesConnection() {
      throw new Error('fallback should not be called');
    }
  }));

  const result = await useCase.execute();
  assert.equal(result.success, false);
  assert.match(result.message, /network error/i);
});
