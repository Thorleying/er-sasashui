/**
 * 管理端访问趋势图（PV/UV）。结构与 AdminTrendChart 一致，便于复用样式与生命周期。
 */
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { buildTrafficTrendOption } from "./trafficTrend";
import type { DayStat } from "./api";

function readTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type AdminTrafficChartProps = {
  days: DayStat[];
};

/** ECharts PV/UV 折线。 */
export function AdminTrafficChart({ days }: AdminTrafficChartProps) {
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
    chartRef.current?.setOption(buildTrafficTrendOption(days, theme), true);
  }, [days, theme]);

  return <div ref={hostRef} className="admin-trend-chart" role="img" aria-label="近七日访问趋势" />;
}
