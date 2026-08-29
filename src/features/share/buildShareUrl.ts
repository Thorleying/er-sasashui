/**
 * 拼完整分享 URL（origin + base + /s/:token）。
 */
import { buildCanonical } from "../../app/seo";

export function buildShareUrl(urlPath: string): string {
  const normalized = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  return buildCanonical(normalized);
}
