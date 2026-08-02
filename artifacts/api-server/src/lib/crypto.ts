import crypto from "crypto";

/**
 * AES-256-GCM symmetric encryption for PII fields (e.g. CNIC).
 * Set ENCRYPTION_KEY to a 64-character hex string (32 bytes) to enable.
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If the key is absent, fields are stored and returned as plaintext (no-op).
 * Encrypted values are prefixed with "enc:" so plaintext legacy values are
 * returned transparently without requiring a migration.
 */

const ENC_PREFIX = "enc:";

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  if (raw.length !== 64) {
    process.stderr.write(
      "[crypto] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). PII encryption is disabled.\n",
    );
    return null;
  }
  return Buffer.from(raw, "hex");
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  if (!key || !plaintext) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(value: string): string {
  if (!value || !value.startsWith(ENC_PREFIX)) return value; // plaintext passthrough
  const key = getKey();
  if (!key) return value; // key not configured — return stored value as-is
  try {
    const parts = value.slice(ENC_PREFIX.length).split(":");
    if (parts.length !== 3) return value;
    const [ivHex, tagHex, encHex] = parts;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return (
      decipher.update(Buffer.from(encHex, "hex")).toString("utf8") +
      decipher.final("utf8")
    );
  } catch {
    return ""; // decryption failed — do not expose raw ciphertext
  }
}
