/**
 * 路由 pathname 变化时将页面滚回顶部（含管理端内容区）。
 */
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** 重置各层滚动容器，避免上一页滚动位置带到新页。 */
export function resetAppScroll(): void {
  if (typeof window === "undefined") return;

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  document.querySelector<HTMLElement>(".admin-content")?.scrollTo(0, 0);
  document.querySelector<HTMLElement>(".user-content")?.scrollTo(0, 0);
}

export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    resetAppScroll();
  }, [pathname]);

  return null;
}
