/**
 * B 端后台壳：深色侧栏 + 顶栏。窄屏侧栏收进抽屉，避免看起来像普通站点页。
 */
import {
  AuditOutlined,
  DashboardOutlined,
  EyeOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Layout, Menu, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { BrandMark } from "./BrandMark";
import { ADMIN_MOBILE_MAX_WIDTH, isAdminMobileViewport } from "./adminMobile";
import "./admin-layout.css";

const MENU_ITEMS = [
  { key: "/admin", icon: <DashboardOutlined />, label: "数据概览" },
  { key: "/admin/users", icon: <TeamOutlined />, label: "用户管理" },
  { key: "/admin/visits", icon: <EyeOutlined />, label: "访问记录" },
  { key: "/admin/ops", icon: <AuditOutlined />, label: "操作记录" },
];

/** 当前路径对应的侧栏项。子路径优先匹配更长的 key。 */
function selectedKey(pathname: string) {
  const match = MENU_ITEMS.filter(
    (item) => pathname === item.key || pathname.startsWith(`${item.key}/`),
  ).sort((a, b) => b.key.length - a.key.length)[0];
  return match?.key ?? "/admin";
}

/** 控制台品牌。抽屉和侧栏共用。 */
function ConsoleBrand() {
  return (
    <Link to="/admin" className="admin-sider-brand" aria-label="ER洒洒水控制台">
      <span className="admin-sider-brand-mark" aria-hidden="true">
        <BrandMark />
      </span>
      <span>
        ER洒洒水
        <small>控制台</small>
      </span>
    </Link>
  );
}

/** 后台壳。菜单只做跳转，权限在 RequireAdmin 和后端。 */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(isAdminMobileViewport);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const current = selectedKey(location.pathname);
  const currentLabel = MENU_ITEMS.find((item) => item.key === current)?.label ?? "数据概览";

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${ADMIN_MOBILE_MAX_WIDTH}px)`);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const go = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[current]}
      items={MENU_ITEMS}
      className="admin-menu"
      onClick={({ key }) => go(key)}
    />
  );

  return (
    <Layout className="admin-shell">
      <a className="skip-link" href="#admin-main">
        跳到正文
      </a>
      {isMobile ? null : (
        <Layout.Sider width={220} theme="dark" className="admin-sider" trigger={null}>
          <ConsoleBrand />
          {menu}
        </Layout.Sider>
      )}
      <Layout className="admin-main">
        <Layout.Header className="admin-header">
          {isMobile ? (
            <Button
              type="text"
              className="admin-header-menu-btn"
              icon={<MenuOutlined />}
              aria-label="打开菜单"
              onClick={() => setDrawerOpen(true)}
            />
          ) : null}
          <Typography.Text className="admin-header-title" ellipsis>
            {currentLabel}
          </Typography.Text>
          <div className="admin-header-actions">
            <Typography.Text type="secondary" className="admin-header-email">
              {user?.email}
            </Typography.Text>
            <Button type="text" className="admin-header-home-btn" onClick={() => navigate("/")}>
              <HomeOutlined aria-hidden />
              <span className="admin-header-home-label">回站点</span>
            </Button>
            <Button
              className="admin-header-logout-btn"
              icon={<LogoutOutlined />}
              onClick={() => {
                void logout().then(() => navigate("/login", { replace: true }));
              }}
            >
              <span className="admin-header-logout-label">退出</span>
            </Button>
          </div>
        </Layout.Header>
        <Layout.Content id="admin-main" className="admin-content">
          <Outlet />
        </Layout.Content>
      </Layout>
      <Drawer
        title={<ConsoleBrand />}
        placement="left"
        width={280}
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="admin-drawer"
        rootClassName="admin-drawer-root"
        styles={{
          header: {
            background: "#1a1916",
            borderBottom: "1px solid #2e2d27",
          },
          body: { padding: 0, background: "#1a1916" },
          content: { background: "#1a1916" },
        }}
      >
        {menu}
      </Drawer>
    </Layout>
  );
}
