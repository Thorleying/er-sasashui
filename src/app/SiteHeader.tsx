/**
 * 用户端顶栏。宽屏横排按钮；窄屏只留品牌和菜单，避免挤成两行或裁切。
 */
import { LogoutOutlined, MenuOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Drawer, Typography } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { BrandMark } from "./BrandMark";
import { currentTheme, setTheme } from "./chrome";

function BrandLink() {
  return (
    <Link to="/" className="user-brand" aria-label="ER洒洒水">
      <span className="user-brand-mark" aria-hidden="true">
        <BrandMark />
      </span>
      <Typography.Text strong>ER洒洒水</Typography.Text>
    </Link>
  );
}

type HeaderActionsProps = {
  landing: boolean;
  compact: boolean;
  mode: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: () => void;
};

/**
 * 导航与账号操作。compact 时按钮拉满，给抽屉用。
 */
function HeaderActions({ landing, compact, mode, onToggleTheme, onNavigate }: HeaderActionsProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const block = compact ? { block: true } : {};

  const go = (path: string, state?: { from: string }) => {
    onNavigate();
    navigate(path, state ? { state } : undefined);
  };

  return (
    <>
      <div className={compact ? "user-header-menu-group" : "user-header-links"}>
        {landing ? (
          <>
            <Button type="text" href="#features" {...block} onClick={onNavigate}>
              特性
            </Button>
            <Button type="text" href="#how" {...block} onClick={onNavigate}>
              用法
            </Button>
            <Button
              type={location.pathname === "/contact" ? "primary" : "text"}
              {...block}
              onClick={() => go("/contact")}
            >
              联系作者
            </Button>
          </>
        ) : (
          <>
            <Button
              type={location.pathname === "/app" ? "primary" : "text"}
              {...block}
              onClick={() => (user ? go("/app") : go("/login", { from: "/app" }))}
            >
              生成器
            </Button>
            <Button
              type={location.pathname === "/contact" ? "primary" : "text"}
              {...block}
              onClick={() => go("/contact")}
            >
              联系作者
            </Button>
          </>
        )}
      </div>
      <div className={compact ? "user-header-menu-group" : "user-header-actions"}>
        {user ? (
          <>
            <Typography.Text type="secondary">{user.email}</Typography.Text>
            {user.role === "admin" ? (
              <Button
                type={location.pathname.startsWith("/admin") ? "primary" : "text"}
                {...block}
                onClick={() => go("/admin")}
              >
                管理端
              </Button>
            ) : null}
            <Button
              icon={<LogoutOutlined />}
              {...block}
              onClick={() => {
                onNavigate();
                void logout();
              }}
            >
              退出
            </Button>
          </>
        ) : (
          <>
            <Button
              type="text"
              {...block}
              onClick={() => go("/login", { from: location.pathname })}
            >
              登录
            </Button>
            <Button type="primary" {...block} onClick={() => go("/register")}>
              注册
            </Button>
          </>
        )}
        <Button
          aria-label="切换主题"
          icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
          onClick={onToggleTheme}
        />
      </div>
    </>
  );
}

export function SiteHeader({ landing = false }: { landing?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setModeState] = useState(currentTheme);
  const closeMenu = () => setMenuOpen(false);

  const actionProps = {
    landing,
    mode,
    onToggleTheme: () => {
      const next = mode === "dark" ? "light" : "dark";
      setTheme(next);
      setModeState(next);
    },
  } as const;

  return (
    <div className="user-header-inner">
      <BrandLink />
      <nav className="user-header-desktop" aria-label="主导航">
        <HeaderActions {...actionProps} compact={false} onNavigate={() => undefined} />
      </nav>
      <Button
        className="user-header-menu-btn"
        icon={<MenuOutlined />}
        aria-label="打开菜单"
        onClick={() => setMenuOpen(true)}
      />
      <Drawer title="菜单" placement="right" width={300} open={menuOpen} onClose={closeMenu}>
        <div className="user-header-menu">
          <HeaderActions {...actionProps} compact onNavigate={closeMenu} />
        </div>
      </Drawer>
    </div>
  );
}
