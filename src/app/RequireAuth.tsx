/**
 * 生成器登录门闩。未登录不能进 /app 出图，带回跳地址去登录页。
 */
import { Spin, Typography } from "antd";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { UserLayout } from "./UserLayout";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <UserLayout>
        <div className="account-wrap" style={{ textAlign: "center", paddingTop: 48 }}>
          <Spin size="large" />
          <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
            正在确认账号…
          </Typography.Paragraph>
        </div>
      </UserLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
