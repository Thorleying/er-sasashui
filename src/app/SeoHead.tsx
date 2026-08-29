/**
 * 按路由更新 document title 与 meta / OG / canonical。
 * SPA 无 SSR 时，至少让可执行 JS 的爬虫拿到正确摘要。
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildCanonical, getSeoForPath, resolveSiteOrigin, siteBasePath } from "./seo";

const JSON_LD_ID = "site-json-ld";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(data: Record<string, unknown> | undefined, canonical: string) {
  const existing = document.getElementById(JSON_LD_ID);
  if (!data) {
    existing?.remove();
    return;
  }
  const script = (existing ?? document.createElement("script")) as HTMLScriptElement;
  script.id = JSON_LD_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({ ...data, url: canonical });
  if (!existing) document.head.appendChild(script);
}

/** 挂在 Router 内，随 pathname 刷新 SEO 标签。 */
export function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoForPath(pathname);
    const canonical = buildCanonical(seo.path);

    document.title = seo.title;
    document.documentElement.lang = "zh-CN";

    upsertMeta("name", "description", seo.description);
    if (seo.keywords) upsertMeta("name", "keywords", seo.keywords);
    upsertMeta(
      "name",
      "robots",
      seo.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "ER洒洒水");
    upsertMeta("property", "og:locale", "zh_CN");
    upsertMeta("property", "og:title", seo.title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:url", canonical);

    const ogImage = `${resolveSiteOrigin()}${siteBasePath()}/brand-mark.svg`;
    upsertMeta("property", "og:image", ogImage);

    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);

    upsertLink("canonical", canonical);
    upsertJsonLd(seo.jsonLd, canonical);
  }, [pathname]);

  return null;
}
