export type ErrorKind = 'network' | 'auth' | 'resource' | 'server' | 'validation' | 'unknown';

export function classifyHttpError(httpCode: number): ErrorKind {
  if (httpCode === 401 || httpCode === 403) return 'auth';
  if (httpCode === 404 || httpCode === 409) return 'resource';
  if (httpCode === 400) return 'validation';
  if (httpCode === 429 || httpCode >= 500) return 'server';
  return 'unknown';
}
