/**
 * 鉴权与操作写入。走内存 Store，不连 3306。
 * 覆盖：注册冲突、登录失败、未登录 401、非管理员 403、管理员可读、JWT role 不可伪造、
 * POST /api/ops 落库、页面访问上报、PV/UV 统计、禁用用户与禁用登录。
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { createMemoryStore } from "./db/memory.js";
import type { Store } from "./db/types.js";
import { createApp } from "./app.js";

const JWT_SECRET = "test-jwt-secret-not-for-runtime";
const CORS_ORIGIN = "http://127.0.0.1";

let store: Store;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  store = createMemoryStore();
  const app = createApp(store, { jwtSecret: JWT_SECRET, corsOrigin: CORS_ORIGIN });
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("测试服务器未绑定到端口");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function sessionCookie(res: Response) {
  const raw = res.headers.getSetCookie();
  const line = raw.find((item) => item.startsWith("er_session="));
  return line ? line.split(";", 1)[0] : "";
}

async function requestJson(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = (await res.json()) as {
    code: number;
    message: string;
    data: unknown;
  };
  return { res, body, status: res.status };
}

async function registerUser(email: string, password = "password1") {
  const result = await requestJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  expect(result.body.code).toBe(0);
  return result;
}

async function promoteAdmin(email: string) {
  const record = await store.findUserByEmail(email);
  expect(record).toBeTruthy();
  record!.role = "admin";
  return record!;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

describe("API 鉴权与操作写入", () => {
  it("重复注册同一邮箱返回 40901", async () => {
    const first = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "conflict@local.test",
        password: "password1",
      }),
    });
    expect(first.status).toBe(200);
    expect(first.body.code).toBe(0);
    expect((first.body.data as { displayName: string }).displayName).toMatch(/^用户\d{4}$/);

    const second = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "conflict@local.test",
        password: "password1",
      }),
    });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe(40901);
    expect(second.body.data).toBeNull();
  });

  it("注册忽略客户端传入的 displayName", async () => {
    const result = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "anon-name@local.test",
        password: "password1",
        displayName: "我自己起的名",
      }),
    });
    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect((result.body.data as { displayName: string }).displayName).toMatch(/^用户\d{4}$/);
    expect((result.body.data as { displayName: string }).displayName).not.toBe("我自己起的名");
  });

  it("错误密码登录返回 40101", async () => {
    const result = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "nobody@local.test",
        password: "wrong-pass",
      }),
    });
    expect(result.status).toBe(401);
    expect(result.body.code).toBe(40101);
    expect(result.body.data).toBeNull();
  });

  it("未登录访问 /me 返回 40102", async () => {
    const result = await requestJson("/api/auth/me");
    expect(result.status).toBe(401);
    expect(result.body.code).toBe(40102);
    expect(result.body.data).toBeNull();
  });

  it("普通用户访问管理接口返回 40301", async () => {
    const registered = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "member@local.test",
        password: "password1",
      }),
    });
    expect(registered.body.code).toBe(0);
    const cookie = sessionCookie(registered.res);
    expect(cookie).toContain("er_session=");

    const result = await requestJson("/api/admin/stats/daily", {
      headers: { cookie },
    });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe(40301);
    expect(result.body.data).toBeNull();

    const usersDenied = await requestJson("/api/admin/users", {
      headers: { cookie },
    });
    expect(usersDenied.status).toBe(403);
    expect(usersDenied.body.code).toBe(40301);

    const opsDenied = await requestJson("/api/admin/ops", {
      headers: { cookie },
    });
    expect(opsDenied.status).toBe(403);
    expect(opsDenied.body.code).toBe(40301);
  });

  it("未登录访问三组管理接口返回 40102", async () => {
    for (const path of ["/api/admin/stats/daily", "/api/admin/users", "/api/admin/ops"]) {
      const result = await requestJson(path);
      expect(result.status).toBe(401);
      expect(result.body.code).toBe(40102);
      expect(result.body.data).toBeNull();
    }
  });

  it("管理员能读取每日情况、用户和操作", async () => {
    const registered = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "admin-reader@local.test",
        password: "password1",
      }),
    });
    expect(registered.body.code).toBe(0);
    const record = await store.findUserByEmail("admin-reader@local.test");
    expect(record).toBeTruthy();
    record!.role = "admin";
    const cookie = sessionCookie(registered.res);

    for (const path of ["/api/admin/stats/daily", "/api/admin/users", "/api/admin/ops"]) {
      const result = await requestJson(path, { headers: { cookie } });
      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
      expect(result.body.data).toBeTruthy();
    }
  });

  it("鉴权以库里的 role 为准，不信 JWT 里的 role", async () => {
    const registered = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "forged-role@local.test",
        password: "password1",
      }),
    });
    const publicUser = registered.body.data as { id: number };
    const forged = jwt.sign({ sub: publicUser.id, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    const result = await requestJson("/api/admin/users", {
      headers: { cookie: `er_session=${forged}` },
    });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe(40301);
    expect(result.body.data).toBeNull();
  });

  it("已登录用户上报操作会写入 Store", async () => {
    const registered = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "ops@local.test",
        password: "password1",
      }),
    });
    const cookie = sessionCookie(registered.res);
    const created = await requestJson("/api/ops", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ action: "generate_er", detail: "png" }),
    });
    expect(created.status).toBe(200);
    expect(created.body.code).toBe(0);
    const data = created.body.data as { id: number };
    expect(data.id).toBeGreaterThan(0);

    const listed = await store.listOps({ page: 1, pageSize: 20 });
    const row = listed.items.find((item) => item.id === data.id);
    expect(row).toBeDefined();
    expect(row?.action).toBe("generate_er");
    expect(row?.detail).toBe("png");
    expect(row?.email).toBe("ops@local.test");
  });

  it("公开 POST /api/track 写入页面访问", async () => {
    const tracked = await requestJson("/api/track", {
      method: "POST",
      body: JSON.stringify({
        visitorId: "visitor-track-1",
        path: "/",
      }),
    });
    expect(tracked.status).toBe(200);
    expect(tracked.body.code).toBe(0);
    const trackData = tracked.body.data as { id: number };
    expect(trackData.id).toBeGreaterThan(0);

    const stats = await store.dailyStats(todayUtc(), todayUtc());
    const today = stats.find((item) => item.date === todayUtc());
    expect(today?.pvCount).toBeGreaterThanOrEqual(1);
    expect(today?.uvCount).toBeGreaterThanOrEqual(1);
  });

  it("每日统计合并 ops 与 page_views 的 PV/UV", async () => {
    const date = todayUtc();
    await store.insertPageView({
      visitorId: "uv-a",
      path: "/a",
      ip: "127.0.0.1",
    });
    await store.insertPageView({
      visitorId: "uv-a",
      path: "/b",
      ip: "127.0.0.1",
    });
    await store.insertPageView({
      visitorId: "uv-b",
      path: "/c",
      ip: "127.0.0.1",
    });

    const registered = await registerUser("stats-merge@local.test");
    const user = registered.body.data as { id: number };
    await store.insertOp({
      userId: user.id,
      action: "generate_er",
      detail: "png",
      ip: "127.0.0.1",
    });

    const admin = await registerUser("stats-admin@local.test");
    await promoteAdmin("stats-admin@local.test");
    const cookie = sessionCookie(admin.res);

    const result = await requestJson(`/api/admin/stats/daily?from=${date}&to=${date}`, {
      headers: { cookie },
    });
    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    const days = (result.body.data as { days: Array<Record<string, number>> }).days;
    const today = days.find((item) => item.date === date);
    expect(today?.pvCount).toBeGreaterThanOrEqual(3);
    expect(today?.uvCount).toBeGreaterThanOrEqual(2);
    expect(today?.generateCount).toBeGreaterThanOrEqual(1);
  });

  it("管理员可禁用普通用户", async () => {
    const target = await registerUser("disable-target@local.test");
    const targetUser = target.body.data as { id: number };
    const admin = await registerUser("disable-admin@local.test");
    await promoteAdmin("disable-admin@local.test");
    const cookie = sessionCookie(admin.res);

    const patched = await requestJson(`/api/admin/users/${targetUser.id}/disabled`, {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify({ disabled: true }),
    });
    expect(patched.status).toBe(200);
    expect(patched.body.code).toBe(0);
    expect((patched.body.data as { disabled: boolean }).disabled).toBe(true);

    const record = await store.findUserById(targetUser.id);
    expect(record?.disabled).toBe(true);
  });

  it("被禁用用户无法登录", async () => {
    await registerUser("disabled-login@local.test");
    const record = await store.findUserByEmail("disabled-login@local.test");
    expect(record).toBeTruthy();
    await store.setUserDisabled(record!.id, true);

    const result = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "disabled-login@local.test",
        password: "password1",
      }),
    });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe(40303);
    expect(result.body.data).toBeNull();
  });

  it("被禁用用户已有 Cookie 访问 /me 视为未登录", async () => {
    const registered = await registerUser("disabled-me@local.test");
    const record = await store.findUserByEmail("disabled-me@local.test");
    expect(record).toBeTruthy();
    await store.setUserDisabled(record!.id, true);
    const cookie = sessionCookie(registered.res);

    const result = await requestJson("/api/auth/me", { headers: { cookie } });
    expect(result.status).toBe(401);
    expect(result.body.code).toBe(40102);
    expect(result.body.data).toBeNull();
  });

  it("管理员可按关键词与状态筛选用户", async () => {
    await registerUser("search-alpha@local.test");
    const beta = await registerUser("search-beta@local.test");
    const betaUser = beta.body.data as { id: number };
    await store.setUserDisabled(betaUser.id, true);

    const admin = await registerUser("search-admin@local.test");
    await promoteAdmin("search-admin@local.test");
    const cookie = sessionCookie(admin.res);

    const byEmail = await requestJson("/api/admin/users?q=search-alpha", { headers: { cookie } });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.code).toBe(0);
    const alphaItems = (byEmail.body.data as { items: Array<{ email: string }> }).items;
    expect(alphaItems.some((item) => item.email === "search-alpha@local.test")).toBe(true);

    const disabledOnly = await requestJson("/api/admin/users?disabled=true", {
      headers: { cookie },
    });
    expect(disabledOnly.status).toBe(200);
    const disabledItems = (disabledOnly.body.data as { items: Array<{ disabled: boolean }> }).items;
    expect(disabledItems.every((item) => item.disabled)).toBe(true);
    expect(disabledItems.some((item) => (item as { email?: string }).email === "search-beta@local.test")).toBe(
      true,
    );
  });

  it("管理员可按用户关键词筛选操作记录", async () => {
    const user = await registerUser("ops-filter@local.test");
    const publicUser = user.body.data as { id: number };
    await store.insertOp({
      userId: publicUser.id,
      action: "login",
      detail: null,
      ip: "127.0.0.1",
    });

    const admin = await registerUser("ops-filter-admin@local.test");
    await promoteAdmin("ops-filter-admin@local.test");
    const cookie = sessionCookie(admin.res);

    const result = await requestJson("/api/admin/ops?q=ops-filter@", { headers: { cookie } });
    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    const items = (result.body.data as { items: Array<{ email: string; action: string }> }).items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.email.includes("ops-filter@"))).toBe(true);
  });
});

describe("分享只读链接", () => {
  const samplePayload = {
    inputText: "Table User { id INT [pk] }",
    isColored: false,
    showComment: false,
    hideFields: false,
    nodes: [{ id: "user", x: 10, y: 20, label: "User" }],
  };

  it("登录用户可创建并公开读取分享", async () => {
    const user = await registerUser("share-user@local.test");
    const cookie = sessionCookie(user.res);

    const created = await requestJson("/api/shares", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ payload: samplePayload }),
    });
    expect(created.status).toBe(200);
    expect(created.body.code).toBe(0);
    const token = (created.body.data as { token: string }).token;
    expect(token).toMatch(/^[a-f0-9]{32}$/i);

    const viewed = await requestJson(`/api/shares/${token}`);
    expect(viewed.status).toBe(200);
    expect(viewed.body.code).toBe(0);
    const data = viewed.body.data as { viewCount: number; payload: typeof samplePayload };
    expect(data.viewCount).toBe(1);
    expect(data.payload.inputText).toBe(samplePayload.inputText);
    expect(data.payload.nodes[0]?.id).toBe("user");
  });

  it("未登录不能创建分享", async () => {
    const result = await requestJson("/api/shares", {
      method: "POST",
      body: JSON.stringify({ payload: samplePayload }),
    });
    expect(result.status).toBe(401);
    expect(result.body.code).toBe(40102);
  });

  it("创建者可删除分享", async () => {
    const user = await registerUser("share-delete@local.test");
    const cookie = sessionCookie(user.res);
    const created = await requestJson("/api/shares", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ payload: samplePayload }),
    });
    const token = (created.body.data as { token: string }).token;

    const deleted = await requestJson(`/api/shares/${token}`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(deleted.body.code).toBe(0);

    const viewed = await requestJson(`/api/shares/${token}`);
    expect(viewed.status).toBe(404);
    expect(viewed.body.code).toBe(40401);
  });
});
