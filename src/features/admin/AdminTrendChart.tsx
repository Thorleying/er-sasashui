/**
 * 管理端趋势图。挂到概览页，数据变化或切主题时重画。
 */
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { buildDailyTrendOption } from "./dailyTrend";
import type { DayStat } from "./api";

function readTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type AdminTrendChartProps = {
  days: DayStat[];
};

/** ECharts 折线。销毁时必须 dispose，避免后台页来回切泄漏实例。 */
export function AdminTrendChart({ days }: AdminTrendChartProps) {
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
    chartRef.current?.setOption(buildDailyTrendOption(days, theme), true);
  }, [days, theme]);

  return <div ref={hostRef} className="admin-trend-chart" role="img" aria-label="近七日使用趋势" />;
}
