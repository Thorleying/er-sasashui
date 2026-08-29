/**
 * 主题跟北京时间走：6:00–18:00 浅色，其余深色。
 * 顶栏仍可临时切换，到下一次日夜边界会收回自动。
 */

export type ThemeMode = "light" | "dark";

export const BEIJING_TZ = "Asia/Shanghai";
export const DAY_START_HOUR = 6;
export const NIGHT_START_HOUR = 18;

let clockStarted = false;
let switchTimer = 0;

type BeijingParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
};

/** 读取某个瞬间的北京日历与小时（0–23）。 */
export function beijingParts(date: Date): BeijingParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BEIJING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
  };
}

/** 6 点到 18 点（不含）为浅色。 */
export function themeFromBeijingHour(hour: number): ThemeMode {
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? "light" : "dark";
}

/** 按北京时间算出此时该用的主题。 */
export function themeFromDate(date: Date = new Date()): ThemeMode {
  return themeFromBeijingHour(beijingParts(date).hour);
}

/**
 * 下一次日夜切换的 UTC 时刻。中国无夏令时，北京 = UTC+8。
 */
export function nextBeijingSwitchAt(now: Date = new Date()): Date {
  const parts = beijingParts(now);
  let year = parts.year;
  let month = parts.month;
  let day = parts.day;
  let hour = NIGHT_START_HOUR;
  if (parts.hour < DAY_START_HOUR) {
    hour = DAY_START_HOUR;
  } else if (parts.hour >= NIGHT_START_HOUR) {
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
    hour = DAY_START_HOUR;
  }
  return new Date(Date.UTC(year, month - 1, day, hour - 8));
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  window.dispatchEvent(new CustomEvent("sql2er-theme", { detail: { theme } }));
}

export function currentTheme(): ThemeMode {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return themeFromDate();
}

/** 临时改主题，持续到下一次北京日夜边界。 */
export function setTheme(theme: ThemeMode) {
  applyTheme(theme);
}

function scheduleNextSwitch() {
  window.clearTimeout(switchTimer);
  const delay = Math.min(
    Math.max(1000, nextBeijingSwitchAt().getTime() - Date.now()),
    2_147_000_000,
  );
  switchTimer = window.setTimeout(() => {
    applyTheme(themeFromDate());
    scheduleNextSwitch();
  }, delay);
}

/** 启动时对齐北京时间，并挂上下一次自动切换。 */
export function startBeijingThemeClock() {
  if (clockStarted || typeof window === "undefined") return;
  clockStarted = true;
  applyTheme(themeFromDate());
  scheduleNextSwitch();
}
