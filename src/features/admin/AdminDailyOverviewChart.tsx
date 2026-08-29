/**
 * 管理端「每日情况」分组柱状图。
 */
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { buildDailyOverviewOption } from "./dailyOverviewTrend";
import type { DayStat } from "./api";

function readTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type AdminDailyOverviewChartProps = {
  days: DayStat[];
};

/** 近 7 日六项指标柱图。 */
export function AdminDailyOverviewChart({ days }: AdminDailyOverviewChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const onTheme = () => setTheme(readTheme());
    window.addEventListener("sql2er-theme", onTheme);
    return () => window.removeEventListener("sql2er-theme", onTheme);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = echarts.init(host);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(buildDailyOverviewOption(days, theme), true);
  }, [days, theme]);

  return (
    <div ref={hostRef} className="admin-overview-chart" role="img" aria-label="近七日每日情况" />
  );
}
