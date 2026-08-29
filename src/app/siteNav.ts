/**
 * 用户端顶栏导航。全站只放生成器和联系作者，不走页内锚点。
 */

export type SiteNavItem = {
  key: string;
  label: string;
  to: string;
  state?: { from: string };
  active: boolean;
};

/** 按登录态和当前路径拼主导航。未登录点生成器先去登录。 */
export function buildSiteNav(pathname: string, loggedIn: boolean): SiteNavItem[] {
  return [
    {
      key: "app",
      label: "生成器",
      to: loggedIn ? "/app" : "/login",
      state: loggedIn ? undefined : { from: "/app" },
      active: pathname === "/app",
    },
    { key: "contact", label: "联系作者", to: "/contact", active: pathname === "/contact" },
  ];
}
