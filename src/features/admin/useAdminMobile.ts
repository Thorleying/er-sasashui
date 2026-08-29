import { useEffect, useState } from "react";
import { ADMIN_MOBILE_MAX_WIDTH, isAdminMobileViewport } from "../../app/adminMobile";

/** 管理端是否窄屏（与 AdminLayout 断点一致）。 */
export function useAdminMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isAdminMobileViewport);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${ADMIN_MOBILE_MAX_WIDTH}px)`);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
