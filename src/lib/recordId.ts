type UuidCrypto = {
  randomUUID?: () => string;
  getRandomValues: (bytes: Uint8Array<ArrayBuffer>) => unknown;
};

/** Record IDs must also work on local HTTP previews, where randomUUID is absent. */
export function secureUuid(
  source: UuidCrypto | undefined = typeof crypto === "undefined" ? undefined : crypto,
): string {
  if (typeof source?.randomUUID === "function") return source.randomUUID();
  if (typeof source?.getRandomValues !== "function") {
    throw new Error(
      "Secure random generation is unavailable. Open Mission Control in a supported browser before saving.",
    );
  }

  const bytes = new Uint8Array(16);
  source.getRandomValues(bytes);
  // UUID version 4 and RFC variant; all remaining bits come from the CSPRNG.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
