import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { formatFilterDate } from "./dateFilter";

describe("formatFilterDate", () => {
  it("把 Dayjs 收成查询用的日期串", () => {
    expect(formatFilterDate(dayjs("2026-08-29"))).toBe("2026-08-29");
  });

  it("空值不进查询", () => {
    expect(formatFilterDate(null)).toBeUndefined();
    expect(formatFilterDate(undefined)).toBeUndefined();
  });
});
