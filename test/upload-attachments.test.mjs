import test from 'node:test';
import assert from 'node:assert/strict';
import { UploadAttachmentsUseCase } from '../dist/app/usecases/upload-attachments.js';

const fakeApiClient = {
  async uploadAttachment(file, filename) {
    if (filename.includes('bad')) {
      return {
        ok: false,
        error: {
          httpCode: 400,
          errorCode: 'VALIDATION_ERROR',
          message: 'invalid file',
          retriable: false
        }
      };
    }
    return {
      ok: true,
      data: {
        id: 1,
        url: `https://wiki.local/uploads/${filename}`,
        filename
      },
      httpCode: 200
    };
  }
};

test('upload attachments returns per-file success/failure', async () => {
  const useCase = new UploadAttachmentsUseCase(fakeApiClient);
  const good = new Blob(['ok'], { type: 'text/plain' });
  const bad = new Blob(['bad'], { type: 'text/plain' });

  const result = await useCase.execute([
    { filename: 'a.txt', file: good },
    { filename: 'bad.txt', file: bad }
  ]);

  assert.equal(result.length, 2);
  assert.equal(result[0].success, true);
  assert.match(result[0].url, /a\.txt/);
  assert.equal(result[1].success, false);
  assert.match(result[1].error, /VALIDATION_ERROR/);
});
