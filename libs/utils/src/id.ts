import * as crypto from 'crypto';

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}
