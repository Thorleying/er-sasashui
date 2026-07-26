import { describe, expect, it } from "vitest";
import { resolveSnapshotUpdatedAt } from "../hooks/useSnapshotPersistence";
import type { SnapshotRecord } from "../types";

const existingSnapshot = {
  id: "snapshot-id",
  inputText: "CREATE TABLE users (id INT);",
  isColored: true,
  showComment: false,
  hideFields: false,
  nodes: [],
  thumbnail: null,
  createdAt: 1_000,
  updatedAt: 2_000,
} satisfies SnapshotRecord;

describe("resolveSnapshotUpdatedAt", () => {
  it("preserves the existing modification time when restoring a snapshot", () => {
    expect(resolveSnapshotUpdatedAt(existingSnapshot, true, 3_000)).toBe(2_000);
  });

  it("uses the current time after a normal user modification", () => {
    expect(resolveSnapshotUpdatedAt(existingSnapshot, false, 3_000)).toBe(3_000);
  });

  it("uses the current time when a restored snapshot has no existing record", () => {
    expect(resolveSnapshotUpdatedAt(null, true, 3_000)).toBe(3_000);
  });
});
