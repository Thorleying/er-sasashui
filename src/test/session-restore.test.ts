import { describe, expect, it } from "vitest";
import { isWithinSessionRestoreWindow, SESSION_RESTORE_MAX_AGE_MS } from "../snapshots";

describe("isWithinSessionRestoreWindow", () => {
  const now = 2_000_000_000_000;

  it("accepts content up to and including six hours old", () => {
    expect(isWithinSessionRestoreWindow(now, now)).toBe(true);
    expect(isWithinSessionRestoreWindow(now - SESSION_RESTORE_MAX_AGE_MS, now)).toBe(true);
  });

  it("rejects content older than six hours or without a valid timestamp", () => {
    expect(isWithinSessionRestoreWindow(now - SESSION_RESTORE_MAX_AGE_MS - 1, now)).toBe(false);
    expect(isWithinSessionRestoreWindow(null, now)).toBe(false);
    expect(isWithinSessionRestoreWindow("invalid", now)).toBe(false);
  });
});
