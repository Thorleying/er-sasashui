import { describe, expect, it } from "vitest";
import { nextBeijingSwitchAt, themeFromBeijingHour, themeFromDate } from "./chrome";

describe("themeFromBeijingHour", () => {
  it("6 点到 17 点是浅色，其余是深色", () => {
    expect(themeFromBeijingHour(5)).toBe("dark");
    expect(themeFromBeijingHour(6)).toBe("light");
    expect(themeFromBeijingHour(17)).toBe("light");
    expect(themeFromBeijingHour(18)).toBe("dark");
    expect(themeFromBeijingHour(0)).toBe("dark");
  });
});

describe("themeFromDate", () => {
  it("按 Asia/Shanghai 小时判断，不看本机时区", () => {
    // 2026-08-29 10:00 北京 = 02:00 UTC
    expect(themeFromDate(new Date("2026-08-29T02:00:00.000Z"))).toBe("light");
    // 2026-08-29 22:00 北京 = 14:00 UTC
    expect(themeFromDate(new Date("2026-08-29T14:00:00.000Z"))).toBe("dark");
  });
});

describe("nextBeijingSwitchAt", () => {
  it("上午切到当天 18:00 北京", () => {
    const next = nextBeijingSwitchAt(new Date("2026-08-29T02:00:00.000Z"));
    expect(next.toISOString()).toBe("2026-08-29T10:00:00.000Z");
  });

  it("傍晚切到次日 6:00 北京", () => {
    const next = nextBeijingSwitchAt(new Date("2026-08-29T11:00:00.000Z"));
    expect(next.toISOString()).toBe("2026-08-29T22:00:00.000Z");
  });

  it("凌晨切到当天 6:00 北京", () => {
    const next = nextBeijingSwitchAt(new Date("2026-08-28T21:00:00.000Z"));
    expect(next.toISOString()).toBe("2026-08-28T22:00:00.000Z");
  });
});
