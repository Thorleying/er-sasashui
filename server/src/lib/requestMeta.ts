/**
 * 从 HTTP 请求提取客户端 IP / User-Agent。优先读代理头，再回退 socket。
 */
import type { Request } from "express";

/** 规范化 IP：去 IPv4-mapped 前缀、环回 ::1、截断长度。 */
export function normalizeIp(raw: string): string {
  const ip = String(raw || "").trim();
  if (!ip) return "0.0.0.0";
  if (ip.startsWith("::ffff:")) return ip.slice(7).slice(0, 64);
  if (ip === "::1") return "127.0.0.1";
  return ip.slice(0, 64);
}

/** 解析真实客户端 IP（支持 X-Forwarded-For / X-Real-IP）。 */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return normalizeIp(forwarded.split(",")[0] ?? "");
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return normalizeIp(String(forwarded[0]).split(",")[0] ?? "");
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return normalizeIp(realIp);
  }
  return normalizeIp(req.socket.remoteAddress ?? "0.0.0.0");
}

/** 读取 User-Agent，空则 null，最长 512 字符。 */
export function clientUserAgent(req: Request): string | null {
  const ua = req.headers["user-agent"];
  if (typeof ua !== "string" || !ua.trim()) return null;
  return ua.trim().slice(0, 512);
}

/** 请求审计元数据：IP + UA，供 ops / page_views 写入。 */
export function requestAuditMeta(req: Request) {
  return {
    ip: clientIp(req),
    userAgent: clientUserAgent(req),
  };
}
