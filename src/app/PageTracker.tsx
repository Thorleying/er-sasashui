/**
 * 路由切换时上报 PV。与 SeoHead 同级挂在 Router 内。
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../features/analytics/track";

/** 随 pathname 变化触发埋点。 */
export function PageTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
