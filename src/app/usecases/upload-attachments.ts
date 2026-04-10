import type { WikiApiClient } from '../../infra/api/wiki-api-client.js';

export interface AttachmentInput {
  filename: string;
  file: Blob;
}

export interface AttachmentUploadResult {
  filename: string;
  url?: string;
  success: boolean;
  error?: string;
}

export class UploadAttachmentsUseCase {
  constructor(private readonly apiClient: WikiApiClient) {}

  async execute(files: AttachmentInput[]): Promise<AttachmentUploadResult[]> {
    const results: AttachmentUploadResult[] = [];

    for (const item of files) {
      const res = await this.apiClient.uploadAttachment(item.file, item.filename);
      if (!res.ok) {
        results.push({
          filename: item.filename,
          success: false,
          error: `${res.error.errorCode}: ${res.error.message}`
        });
        continue;
      }

      results.push({
        filename: item.filename,
        success: true,
        url: res.data.url
      });
    }

    return results;
  }
}
