/**
 * 全站 SEO 元数据：标题、描述、索引策略。
 * canonical / sitemap 需带 Vite BASE_PATH（GitHub Pages 子路径部署）。
 */

export const SITE_NAME = "ER洒洒水";

export const DEFAULT_DESCRIPTION =
  "免费在线 SQL、DBML 转 ER 图工具，适合计算机毕业设计、MySQL 课设与数据库课程设计。浏览器本地解析 CREATE TABLE 建表语句，支持 Chen 记法、拖拽排版与 PNG / SVG / Drawio 导出。";

export const DEFAULT_KEYWORDS =
  "SQL转ER图,DBML,ER图,实体关系图,E-R图,Chen记法,建表语句,CREATE TABLE,数据库设计,MySQL,PostgreSQL,计算机毕业设计,毕设,课程设计,数据库课设,论文ER图,在线ER图工具,ER图生成器,ER洒洒水";

export type SeoConfig = {
  title: string;
  description: string;
  keywords?: string;
  /** 相对路径，如 /terms */
  path: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
};

/** 部署根 URL；未配置 VITE_SITE_URL 时运行时用当前 origin。 */
export function resolveSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Vite base，如 /sql_to_ER/；根部署时为 / */
export function siteBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return "";
  return base.replace(/\/$/, "");
}

/** 拼 canonical：origin + base + path */
export function buildCanonical(path: string): string {
  const origin = resolveSiteOrigin();
  const base = siteBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `${origin}${base}/`.replace(/([^:]\/)\/+/g, "$1");
  return `${origin}${base}${normalized}`.replace(/([^:]\/)\/+/g, "$1");
}

const ROUTE_SEO: Record<string, Omit<SeoConfig, "path">> = {
  "/": {
    title: `${SITE_NAME} — 把 SQL / DBML 变成 ER 图`,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
      description: DEFAULT_DESCRIPTION,
      inLanguage: "zh-CN",
      featureList: [
        "SQL 转 ER 图",
        "DBML 支持",
        "MySQL CREATE TABLE",
        "Chen 记法",
        "计算机毕业设计 ER 图",
        "数据库课程设计",
        "PNG/SVG/Drawio 导出",
        "浏览器本地解析",
      ],
    },
  },
  "/login": {
    title: `登录 — ${SITE_NAME}`,
    description: `登录 ${SITE_NAME}，粘贴 SQL 或 DBML 即可生成实体关系图。`,
    noindex: true,
  },
  "/register": {
    title: `注册 — ${SITE_NAME}`,
    description: `免费注册 ${SITE_NAME}，马上把建表语句变成 Chen 记法 ER 图。`,
    noindex: true,
  },
  "/app": {
    title: `生成器 — ${SITE_NAME}`,
    description: "在线 ER 图生成器：粘贴 SQL / DBML，拖拽排版，导出 PNG、SVG 或 Drawio。",
    noindex: true,
  },
  "/terms": {
    title: `用户协议 — ${SITE_NAME}`,
    description: `${SITE_NAME} 用户协议与使用规则。`,
  },
  "/privacy": {
    title: `隐私政策 — ${SITE_NAME}`,
    description: `${SITE_NAME} 隐私政策：说明账号、本地解析与日志如何处理。`,
  },
  "/contact": {
    title: `联系作者 — ${SITE_NAME}`,
    description: `联系 ER洒洒水作者 Thorleying，微信 coder_Thorleying。全栈开发，Java / Python / 逆向等。`,
  },
  "/s": {
    title: `分享 — ${SITE_NAME}`,
    description: "只读 ER 图分享链接，无需登录即可查看。",
    noindex: true,
  },
  "/admin": {
    title: `管理端 — ${SITE_NAME}`,
    description: "内部管理控制台。",
    noindex: true,
  },
};

/** 按 pathname 取 SEO；管理子路由统一 noindex。 */
export function getSeoForPath(pathname: string): SeoConfig {
  if (pathname.startsWith("/admin")) {
    return { path: pathname, ...ROUTE_SEO["/admin"] };
  }
  if (pathname.startsWith("/s/")) {
    return { path: pathname, ...ROUTE_SEO["/s"] };
  }
  const hit = ROUTE_SEO[pathname];
  if (hit) return { path: pathname, ...hit };
  return {
    path: pathname,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
  };
}

/** 构建阶段写入 sitemap 的公开路径（不含需登录的工具页）。 */
export const PUBLIC_SITEMAP_PATHS = ["/", "/terms", "/privacy", "/contact", "/login", "/register"] as const;
