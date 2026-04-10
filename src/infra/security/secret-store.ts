export interface SecretStore {
  seal(plain: string): string;
  unseal(cipher: string): string;
}

/**
 * v0 implementation for local development.
 * TODO: replace with Siyuan secure storage API in production.
 */
export class SimpleSecretStore implements SecretStore {
  seal(plain: string): string {
    return [...plain]
      .map((ch, index) => (ch.charCodeAt(0) ^ this.salt(index)).toString(16).padStart(2, '0'))
      .join('');
  }

  unseal(cipher: string): string {
    const pairs = cipher.match(/.{1,2}/g) ?? [];
    return pairs
      .map((hex, index) => String.fromCharCode((parseInt(hex, 16) ^ this.salt(index)) & 0xff))
      .join('');
  }

  private salt(index: number): number {
    return 73 + (index % 17);
  }
}
