/**
 * 管理端门闩。未登录去登录；已登录但不是 admin 给 403，不渲染后台。
 * 数据权限仍以后端 requireAdmin 为准。
 */
import { Button, Result, Spin } from "antd";
import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { UserLayout } from "./UserLayout";
import "./admin-layout.css";

/**
 * @param children 仅 role=admin 时渲染
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="admin-boot">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== "admin") {
    return (
      <UserLayout>
        <Result
          status="403"
          title="没有权限"
          extra={
            <Button type="primary" onClick={() => navigate("/")}>
              回首页
            </Button>
          }
        />
      </UserLayout>
    );
  }

  return children;
}
