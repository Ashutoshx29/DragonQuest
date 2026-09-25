import * as Crypto from 'expo-crypto';

/** Generate a RFC4122 v4 UUID (crypto-secure, works in Expo Go). */
export function uuid(): string {
  return Crypto.randomUUID();
}
