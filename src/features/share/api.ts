/**
 * 分享链接 API。创建/删除需登录；读取公开。
 */
import type { ApiEnvelope } from "../auth/types";
import type { CreateShareResult, PublicShare, SharePayload } from "./types";

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, credentials: "include" });
  } catch {
    return { code: 50001, message: "后端连不上，确认 API 已启动", data: null as T };
  }
  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    return { code: 50001, message: "服务器返回无法解析", data: null as T };
  }
}

/** 创建只读分享链接（需登录）。 */
export function createShareRequest(input: { title?: string; payload: SharePayload }) {
  return request<CreateShareResult>("/api/shares", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 公开读取分享内容。 */
export function getShareRequest(token: string) {
  return request<PublicShare>(`/api/shares/${encodeURIComponent(token)}`);
}

/** 撤销自己的分享链接。 */
export function revokeShareRequest(token: string) {
  return request<null>(`/api/shares/${encodeURIComponent(token)}`, { method: "DELETE" });
}
