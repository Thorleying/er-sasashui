import { describe, expect, it } from "vitest";
import type { SnapshotRecord } from "../../types";
import { buildShareTableCards } from "./shareTableCards";

function snapshot(inputText: string): SnapshotRecord {
  return {
    id: "s",
    inputText,
    isColored: false,
    showComment: false,
    hideFields: false,
    nodes: [],
    thumbnail: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("buildShareTableCards", () => {
  it("按表拆成多张卡，不把所有表塞进同一份图", () => {
    const cards = buildShareTableCards(
      snapshot(`
        CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(64));
        CREATE TABLE ops (id INT PRIMARY KEY, user_id INT);
      `),
    );

    expect(cards.map((card) => card.name)).toEqual(["users", "ops"]);
    expect(cards[0].data.nodes.some((node) => node.id === "entity-users-0")).toBe(true);
    expect(cards[0].data.nodes.some((node) => String(node.id).includes("ops"))).toBe(false);
    expect(cards[1].data.nodes.some((node) => node.id === "entity-ops-1")).toBe(true);
  });
});
