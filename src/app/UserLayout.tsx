/**
 * 用户端页面壳：antd Layout + 顶栏。编辑器变体占满剩余视口。
 */
import { Layout } from "antd";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import "./user-layout.css";

type UserLayoutProps = {
  children: ReactNode;
  landing?: boolean;
  variant?: "page" | "editor" | "landing";
};

export function UserLayout({ children, landing = false, variant }: UserLayoutProps) {
  const mode = variant ?? (landing ? "landing" : "page");
  return (
    <Layout className={`user-layout user-layout--${mode}`}>
      <a className="skip-link" href="#main">
        跳到正文
      </a>
      <Layout.Header className="user-header">
        <SiteHeader />
      </Layout.Header>
      <Layout.Content id="main" className="user-content">
        {children}
      </Layout.Content>
      {mode !== "editor" ? <SiteFooter /> : null}
    </Layout>
  );
}
