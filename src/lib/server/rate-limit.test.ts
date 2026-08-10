import { describe, expect, it } from "vitest";
import { isRateLimited } from "./rate-limit";

describe("isRateLimited", () => {
  it("allows requests up to the configured limit", () => {
    const key = `allow-${crypto.randomUUID()}`;
    expect(isRateLimited(key, 2, 60_000)).toBe(false);
    expect(isRateLimited(key, 2, 60_000)).toBe(false);
  });

  it("blocks requests above the configured limit", () => {
    const key = `block-${crypto.randomUUID()}`;
    isRateLimited(key, 1, 60_000);
    expect(isRateLimited(key, 1, 60_000)).toBe(true);
  });
});
