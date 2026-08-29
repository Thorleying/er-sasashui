/**
 * 登录 / 注册独立壳。
 * 左侧夜色海报、右侧纸面表单。本页颜色不跟全站 data-theme 走，
 * 否则系统暗色会把两边一起染黑，对开结构塌掉。
 */
import { ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import "./auth-layout.css";

const AUTH_PAPER_SANS =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif';

/** 右侧表单强制浅色算法。左侧海报用原生标题，避免 antd 标题被染成深色字。 */
const AUTH_PAPER_THEME = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#d97757",
    colorInfo: "#6a9bcc",
    colorSuccess: "#6b8f47",
    colorWarning: "#c9943a",
    colorError: "#c0453a",
    colorBgLayout: "#ece9e0",
    colorBgContainer: "#fdfcf8",
    colorText: "#141413",
    borderRadius: 12,
    fontFamily: AUTH_PAPER_SANS,
    fontSize: 16,
    controlHeightLG: 48,
  },
};

type AuthLayoutProps = {
  children: ReactNode;
  asideTitle: string;
  asideLead?: string;
};

/** 左侧装饰：实体、菱形、连线。只做气氛，不拦截点击。 */
function AuthConstellation() {
  return (
    <svg className="auth-constellation" viewBox="0 0 480 640" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="196" y="72" width="88" height="56" rx="6" />
        <ellipse cx="98" cy="188" rx="46" ry="28" />
        <ellipse cx="382" cy="176" rx="46" ry="28" />
        <path d="M240 200v52" />
        <path d="M196 228H98" />
        <path d="M284 220h98" />
        <path d="M240 252l36 36-36 36-36-36z" />
        <path d="M204 324v40" />
        <path d="M276 324v40" />
        <rect x="72" y="364" width="96" height="56" rx="6" />
        <rect x="312" y="364" width="96" height="56" rx="6" />
        <ellipse cx="120" cy="500" rx="40" ry="24" />
        <ellipse cx="360" cy="508" rx="40" ry="24" />
        <path d="M120 420v56" />
        <path d="M360 420v64" />
      </g>
    </svg>
  );
}

/**
 * 账号页壳。
 * @param asideTitle 左侧主标题，页面各自传入
 * @param asideLead 可选一句说明，不要写长段
 */
export function AuthLayout({ children, asideTitle, asideLead }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <a className="skip-link" href="#auth-main">
        跳到正文
      </a>
      <aside className="auth-aside">
        <AuthConstellation />
        <div className="auth-aside-inner">
          <Link to="/" className="auth-brand" aria-label="ER洒洒水">
            <span className="auth-brand-mark" aria-hidden="true">
              <BrandMark />
            </span>
            <span>ER洒洒水</span>
          </Link>
          <div className="auth-aside-copy">
            <p className="auth-aside-kicker">SQL / DBML → ER</p>
            <h1 className="auth-aside-title">{asideTitle}</h1>
            {asideLead ? <p className="auth-aside-lead">{asideLead}</p> : null}
            <p className="auth-aside-note">免费使用</p>
          </div>
          <Link to="/" className="auth-back">
            返回首页
          </Link>
        </div>
      </aside>
      <main id="auth-main" className="auth-main">
        <ConfigProvider theme={AUTH_PAPER_THEME}>{children}</ConfigProvider>
      </main>
    </div>
  );
}
