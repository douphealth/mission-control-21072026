import { afterEach, describe, expect, it, vi } from "vitest";
import { secureUuid } from "../recordId";

const UUID = "00112233-4455-4677-8899-aabbccddeeff" as const;
const fallbackSource = () => ({
  getRandomValues: vi.fn(((bytes: Uint8Array) => {
    for (let index = 0; index < bytes.length; index++) bytes[index] = index;
    return bytes;
  }) as Crypto["getRandomValues"]),
});

afterEach(() => vi.restoreAllMocks());

describe("Secure record IDs in local HTTP browsers", () => {
  it("uses native randomUUID when available", () => {
    const source = { ...fallbackSource(), randomUUID: vi.fn(() => UUID) };
    expect(secureUuid(source)).toBe(UUID);
    expect(source.randomUUID).toHaveBeenCalledOnce();
    expect(source.getRandomValues).not.toHaveBeenCalled();
  });

  it("generates a version 4 UUID from getRandomValues when randomUUID is absent", () => {
    const source = fallbackSource();
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Insecure randomness must not be used");
    });
    expect(secureUuid(source)).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(source.getRandomValues).toHaveBeenCalledOnce();
    expect(source.getRandomValues.mock.calls[0][0]).toHaveLength(16);
  });

  it("sets the version and RFC variant bits without replacing random bytes", () => {
    const source = {
      getRandomValues: ((bytes: Uint8Array) => {
        bytes.fill(255);
        return bytes;
      }) as Crypto["getRandomValues"],
    };
    expect(secureUuid(source)).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  it("fails explicitly when secure randomness is not available", () => {
    expect(() => secureUuid({} as Crypto)).toThrow(/Secure random generation is unavailable/);
  });
});
