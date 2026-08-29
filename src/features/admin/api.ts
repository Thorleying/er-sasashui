/**
 * 管理端查询与用户状态变更。非 admin 由后端 403，前端只负责展示与操作反馈。
 */
import type { ApiEnvelope } from "../auth/types";

export { trackPageView } from "../analytics/track";

export type DayStat = {
  date: string;
  pvCount: number;
  uvCount: number;
  registerCount: number;
  loginCount: number;
  generateCount: number;
  exportCount: number;
};

export type AdminUser = {
  id: number;
  email: string;
  displayName: string;
  role: "user" | "admin";
  disabled: boolean;
  registerIp: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminOp = {
  id: number;
  userId: number;
  email: string;
  displayName: string;
  action: string;
  detail: string | null;
  ip: string;
  userAgent: string | null;
  createdAt: string;
};

export type AdminPageView = {
  id: number;
  visitorId: string;
  path: string;
  ip: string;
  userAgent: string | null;
  userId: number | null;
  email: string | null;
  displayName: string | null;
  createdAt: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    const res = await fetch(path, { ...init, headers, credentials: "include" });
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    return { code: 50001, message: "后端连不上，确认 API 已启动", data: null as T };
  }
}

export const ADMIN_PAGE_SIZE = 20;

export type UsersQuery = {
  page?: number;
  pageSize?: number;
  /** 邮箱、显示名或用户 ID */
  q?: string;
  role?: "user" | "admin";
  disabled?: boolean;
};

export type OpsQuery = {
  page?: number;
  pageSize?: number;
  userId?: number;
  /** 用户邮箱或显示名关键词 */
  q?: string;
  action?: string;
  ip?: string;
  from?: string;
  to?: string;
};

export type PageViewsQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  path?: string;
  ip?: string;
  from?: string;
  to?: string;
};

export function fetchDailyStats() {
  return request<{ days: DayStat[] }>("/api/admin/stats/daily");
}

/** 用户分页与筛选。空条件不进 query。 */
export function fetchUsers(query: UsersQuery = {}) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? ADMIN_PAGE_SIZE));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.role) params.set("role", query.role);
  if (query.disabled !== undefined) params.set("disabled", String(query.disabled));
  return request<{ page: number; pageSize: number; total: number; items: AdminUser[] }>(
    `/api/admin/users?${params.toString()}`,
  );
}

/** 操作分页。空过滤条件不进 query，避免 `userId=` 被后端当成 0。 */
export function fetchOps(query: OpsQuery = {}) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? ADMIN_PAGE_SIZE));
  if (query.userId) params.set("userId", String(query.userId));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.action) params.set("action", query.action);
  if (query.ip?.trim()) params.set("ip", query.ip.trim());
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return request<{ page: number; pageSize: number; total: number; items: AdminOp[] }>(
    `/api/admin/ops?${params.toString()}`,
  );
}

/** 页面访问（PV）分页，含 IP / UA。 */
export function fetchPageViews(query: PageViewsQuery = {}) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? ADMIN_PAGE_SIZE));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.path?.trim()) params.set("path", query.path.trim());
  if (query.ip?.trim()) params.set("ip", query.ip.trim());
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return request<{ page: number; pageSize: number; total: number; items: AdminPageView[] }>(
    `/api/admin/page-views?${params.toString()}`,
  );
}

/** 禁用或启用用户。管理员账号通常由后端拒绝变更。 */
export function setUserDisabled(id: number, disabled: boolean) {
  return request<{ id: number; disabled: boolean }>(`/api/admin/users/${id}/disabled`, {
    method: "PATCH",
    body: JSON.stringify({ disabled }),
  });
}
