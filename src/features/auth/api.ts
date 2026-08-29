/**
 * 认证请求封装。组件禁止直接 fetch。
 * 必须带 credentials，后端会话在 httpOnly Cookie 里。
 */
import type { ApiEnvelope, PublicUser } from "./types";

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

export function loginRequest(email: string, password: string) {
  return request<PublicUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** 注册只传邮箱和密码，显示名由服务端生成。 */
export function registerRequest(input: { email: string; password: string }) {
  return request<PublicUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logoutRequest() {
  return request<null>("/api/auth/logout", { method: "POST" });
}

export function meRequest() {
  return request<PublicUser>("/api/auth/me");
}

export function reportOp(action: "generate_er" | "export", detail?: string | null) {
  return request<{ id: number }>("/api/ops", {
    method: "POST",
    body: JSON.stringify({ action, detail: detail ?? null }),
  });
}
