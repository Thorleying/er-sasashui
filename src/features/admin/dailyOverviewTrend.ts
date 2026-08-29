/**
 * 管理端「每日情况」分组柱状图：单日六项指标并列对比。
 */
import type { EChartsOption } from "echarts";
import type { DayStat } from "./api";

const METRICS = [
  { key: "pvCount" as const, name: "PV", color: "#d97757" },
  { key: "uvCount" as const, name: "UV", color: "#e8a066" },
  { key: "registerCount" as const, name: "新用户", color: "#c9a06a" },
  { key: "loginCount" as const, name: "登录", color: "#a68b5b" },
  { key: "generateCount" as const, name: "生成", color: "#8b6f4e" },
  { key: "exportCount" as const, name: "导出", color: "#5c5348" },
];

/** 近 7 日六项指标分组柱图 option。 */
export function buildDailyOverviewOption(days: DayStat[], theme: "light" | "dark"): EChartsOption {
  const ink = theme === "dark" ? "#eae7dc" : "#141413";
  const muted = theme === "dark" ? "#a9a69c" : "#6b6860";
  const rule = theme === "dark" ? "#3a3830" : "#d8d5cc";

  return {
    color: METRICS.map((item) => item.color),
    textStyle: { color: ink, fontFamily: "inherit" },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      data: METRICS.map((item) => item.name),
      textStyle: { color: muted },
      top: 0,
      type: "scroll",
    },
    grid: { left: 36, right: 16, top: 48, bottom: 28 },
    xAxis: {
      type: "category",
      data: days.map((item) => item.date.slice(5)),
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
    },
    series: METRICS.map((item) => ({
      name: item.name,
      type: "bar",
      barMaxWidth: 18,
      emphasis: { focus: "series" },
      data: days.map((day) => day[item.key]),
    })),
  };
}
