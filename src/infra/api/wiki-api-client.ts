import type { ApiResult } from '../../shared/types.js';
import type { CreatePagePayload, PageResponse, UpdatePagePayload } from './dto.js';

export interface WikiApiClient {
  checkConnection(): Promise<ApiResult<{ ok: true }>>;
  createPage(payload: CreatePagePayload): Promise<ApiResult<PageResponse>>;
  updatePage(slug: string, payload: UpdatePagePayload): Promise<ApiResult<PageResponse>>;
  deletePage(slug: string): Promise<ApiResult<{ deleted: true }>>;
  getPage(slug: string): Promise<ApiResult<PageResponse>>;
}

export class FetchWikiApiClient implements WikiApiClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  async checkConnection(): Promise<ApiResult<{ ok: true }>> {
    return this.request('/auth/me', { method: 'GET' });
  }

  async createPage(payload: CreatePagePayload): Promise<ApiResult<PageResponse>> {
    return this.request('/pages', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updatePage(slug: string, payload: UpdatePagePayload): Promise<ApiResult<PageResponse>> {
    return this.request(`/pages/${slug}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deletePage(slug: string): Promise<ApiResult<{ deleted: true }>> {
    return this.request(`/pages/${slug}`, { method: 'DELETE' });
  }

  async getPage(slug: string): Promise<ApiResult<PageResponse>> {
    return this.request(`/pages/${slug}`, { method: 'GET' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
    try {
      const resp = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {})
        }
      });
      const data = (await resp.json().catch(() => ({}))) as T;
      if (!resp.ok) {
        return {
          ok: false,
          error: {
            httpCode: resp.status,
            errorCode: `HTTP_${resp.status}`,
            message: `Wiki API request failed: ${resp.status}`,
            retriable: resp.status === 429 || resp.status >= 500
          }
        };
      }
      return { ok: true, data, httpCode: resp.status };
    } catch (error) {
      return {
        ok: false,
        error: {
          httpCode: 0,
          errorCode: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown network error',
          retriable: true
        }
      };
    }
  }
}
