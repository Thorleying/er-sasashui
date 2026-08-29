/**
 * 构建后写入 dist/sitemap.xml。需 VITE_SITE_URL（或默认 GitHub Pages 根域）。
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const base = (process.env.BASE_PATH || "/").replace(/\/$/, "");
const site = (process.env.VITE_SITE_URL || "https://ystemsrx.github.io").replace(/\/$/, "");
const origin = `${site}${base === "" || base === "/" ? "" : base}`;

const paths = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/terms", changefreq: "monthly", priority: "0.5" },
  { loc: "/privacy", changefreq: "monthly", priority: "0.5" },
  { loc: "/contact", changefreq: "monthly", priority: "0.5" },
  { loc: "/login", changefreq: "monthly", priority: "0.4" },
  { loc: "/register", changefreq: "monthly", priority: "0.4" },
];

const body = paths
  .map(
    (item) =>
      `  <url><loc>${origin}${item.loc === "/" ? "/" : item.loc}</loc><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(resolve("dist/sitemap.xml"), xml, "utf8");
console.log(`[sitemap] wrote ${origin} (${paths.length} urls)`);
