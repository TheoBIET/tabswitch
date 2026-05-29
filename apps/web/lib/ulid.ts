// Lightweight ULID-ish (Crockford base32, 26 chars). For session ids only.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(): string {
  const time = Date.now();
  let timeStr = '';
  let t = time;
  for (let i = 0; i < 10; i++) {
    timeStr = ALPHABET[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  let randomStr = '';
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 16; i++) {
    randomStr += ALPHABET[bytes[i]! % 32];
  }
  return timeStr + randomStr;
}
