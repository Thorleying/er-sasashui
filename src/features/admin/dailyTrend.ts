/**
 * 管理端近七日使用趋势（注册/登录/生成/导出）。PV/UV 见 trafficTrend.ts。
 */
import type { EChartsOption } from "echarts";
import type { DayStat } from "./api";

const SERIES = [
  { key: "registerCount" as const, name: "新用户", color: "#d97757" },
  { key: "loginCount" as const, name: "登录", color: "#c9a06a" },
  { key: "generateCount" as const, name: "生成", color: "#8b6f4e" },
  { key: "exportCount" as const, name: "导出", color: "#5c5348" },
];

/**
 * 把每日统计转成折线图 option。theme 只影响轴和字色，系列色固定 terracotta 一组。
 */
export function buildDailyTrendOption(days: DayStat[], theme: "light" | "dark"): EChartsOption {
  const ink = theme === "dark" ? "#eae7dc" : "#141413";
  const muted = theme === "dark" ? "#a9a69c" : "#6b6860";
  const rule = theme === "dark" ? "#3a3830" : "#d8d5cc";

  return {
    color: SERIES.map((item) => item.color),
    textStyle: { color: ink, fontFamily: "inherit" },
    tooltip: { trigger: "axis" },
    legend: {
      data: SERIES.map((item) => item.name),
      textStyle: { color: muted },
      top: 0,
    },
    grid: { left: 36, right: 16, top: 40, bottom: 28 },
    xAxis: {
      type: "category",
      data: days.map((item) => item.date.slice(5)),
      boundaryGap: false,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted },
    },
    series: SERIES.map((item) => ({
      name: item.name,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      data: days.map((day) => day[item.key]),
    })),
  };
}
