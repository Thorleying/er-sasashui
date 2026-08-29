/**
 * 用户端顶栏。三栏：品牌 | 导航 | 账号。窄屏同一套结构收紧换行，不另开抽屉。
 */
import { LogoutOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { BrandMark } from "./BrandMark";
import { currentTheme, setTheme } from "./chrome";
import { buildSiteNav, type SiteNavItem } from "./siteNav";

function BrandLink() {
  return (
    <Link to="/" className="user-brand" aria-label="ER洒洒水">
      <span className="user-brand-mark" aria-hidden="true">
        <BrandMark />
      </span>
      <span className="user-brand-name">ER洒洒水</span>
    </Link>
  );
}

function NavItem({ item }: { item: SiteNavItem }) {
  return (
    <Link
      className={item.active ? "user-nav-item is-active" : "user-nav-item"}
      to={item.to}
      state={item.state}
    >
      {item.label}
    </Link>
  );
}

/**
 * 账号区：登录态显示邮箱 / 管理端 / 退出，否则登录 + 注册。主题始终在末尾。
 */
function HeaderAccount({
  mode,
  onToggleTheme,
}: {
  mode: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="user-header-account">
      {user ? (
        <>
          <span className="user-header-email">{user.email}</span>
          {user.role === "admin" ? (
            <Link
              className={
                location.pathname.startsWith("/admin") ? "user-nav-item is-active" : "user-nav-item"
              }
              to="/admin"
            >
              管理端
            </Link>
          ) : null}
          <button type="button" className="user-nav-item" onClick={() => void logout()}>
            <LogoutOutlined />
            退出
          </button>
        </>
      ) : (
        <>
          <Link className="user-nav-item" to="/login" state={{ from: location.pathname }}>
            登录
          </Link>
          <Link className="user-header-cta" to="/register">
            注册
          </Link>
        </>
      )}
      <button
        type="button"
        className="user-header-icon"
        aria-label="切换主题（默认跟北京时间日夜）"
        onClick={onToggleTheme}
      >
        {mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
      </button>
    </div>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const [mode, setModeState] = useState(currentTheme);
  const nav = buildSiteNav(location.pathname, Boolean(user));

  return (
    <div className="user-header-inner">
      <BrandLink />
      <nav className="user-header-nav" aria-label="主导航">
        {nav.map((item) => (
          <NavItem key={item.key} item={item} />
        ))}
      </nav>
      <div className="user-header-end">
        <HeaderAccount
          mode={mode}
          onToggleTheme={() => {
            const next = mode === "dark" ? "light" : "dark";
            setTheme(next);
            setModeState(next);
          }}
        />
      </div>
    </div>
  );
}
