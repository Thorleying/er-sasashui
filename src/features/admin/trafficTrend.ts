/**
 * 管理端访问趋势（PV/UV）ECharts 配置。纯函数，方便单测。
 */
import type { EChartsOption } from "echarts";
import type { DayStat } from "./api";

const SERIES = [
  { key: "pvCount" as const, name: "PV", color: "#d97757" },
  { key: "uvCount" as const, name: "UV", color: "#8b6f4e" },
];

/**
 * 把每日 PV/UV 转成折线图 option。
 */
export function buildTrafficTrendOption(days: DayStat[], theme: "light" | "dark"): EChartsOption {
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
