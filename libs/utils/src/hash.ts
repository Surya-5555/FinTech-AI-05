import * as crypto from 'crypto';

export function generateStableHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
