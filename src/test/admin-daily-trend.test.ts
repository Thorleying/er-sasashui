/**
 * 管理端趋势图 option。确认使用/访问系列和日期轴对得上。
 */
import { describe, expect, it } from "vitest";
import { buildDailyTrendOption } from "../features/admin/dailyTrend";
import { buildDailyOverviewOption } from "../features/admin/dailyOverviewTrend";
import { buildTrafficTrendOption } from "../features/admin/trafficTrend";

describe("buildDailyTrendOption", () => {
  it("用日期做横轴，四条使用系列对应四类计数", () => {
    const option = buildDailyTrendOption(
      [
        {
          date: "2026-08-28",
          pvCount: 10,
          uvCount: 5,
          registerCount: 1,
          loginCount: 3,
          generateCount: 2,
          exportCount: 0,
        },
      ],
      "light",
    );
    expect(option.xAxis).toMatchObject({ data: ["08-28"] });
    const series = option.series as { name: string; data: number[] }[];
    expect(series.map((item) => item.name)).toEqual(["新用户", "登录", "生成", "导出"]);
    expect(series.map((item) => item.data)).toEqual([[1], [3], [2], [0]]);
  });
});

describe("buildTrafficTrendOption", () => {
  it("用日期做横轴，PV/UV 两条系列", () => {
    const option = buildTrafficTrendOption(
      [
        {
          date: "2026-08-28",
          pvCount: 100,
          uvCount: 40,
          registerCount: 0,
          loginCount: 0,
          generateCount: 0,
          exportCount: 0,
        },
      ],
      "light",
    );
    expect(option.xAxis).toMatchObject({ data: ["08-28"] });
    const series = option.series as { name: string; data: number[] }[];
    expect(series.map((item) => item.name)).toEqual(["PV", "UV"]);
    expect(series.map((item) => item.data)).toEqual([[100], [40]]);
  });
});

describe("buildDailyOverviewOption", () => {
  it("用日期做横轴，六项指标分组柱图", () => {
    const option = buildDailyOverviewOption(
      [
        {
          date: "2026-08-28",
          pvCount: 10,
          uvCount: 5,
          registerCount: 1,
          loginCount: 3,
          generateCount: 2,
          exportCount: 4,
        },
      ],
      "light",
    );
    expect(option.xAxis).toMatchObject({ data: ["08-28"] });
    const series = option.series as { name: string; type: string; data: number[] }[];
    expect(series.map((item) => item.name)).toEqual([
      "PV",
      "UV",
      "新用户",
      "登录",
      "生成",
      "导出",
    ]);
    expect(series.every((item) => item.type === "bar")).toBe(true);
    expect(series.map((item) => item.data)).toEqual([[10], [5], [1], [3], [2], [4]]);
  });
});
