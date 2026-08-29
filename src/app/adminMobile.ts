/**
 * 管理端移动端断点（与 antd lg 对齐）。
 */
export const ADMIN_MOBILE_MAX_WIDTH = 991;

/** 是否窄屏管理端布局。 */
export function isAdminMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${ADMIN_MOBILE_MAX_WIDTH}px)`).matches;
}
