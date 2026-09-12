const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function hashFeedPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function verifyFeedPassword(password: string, salt: string, expectedHash: string) {
  if (!expectedHash) return false;
  const actual = await hashFeedPassword(password, salt);
  return actual === expectedHash;
}

export function unlockCookieName(id: number) {
  return `feed_unlock_${id}`;
}

export async function unlockCookieValue(id: number, passwordHash: string) {
  const data = enc.encode(`${id}:${passwordHash}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

export function isProtected(feed: { passwordHash?: string | null }) {
  return Boolean(feed.passwordHash);
}