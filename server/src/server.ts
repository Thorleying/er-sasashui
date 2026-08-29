/**
 * 进程入口：优先连 MySQL（缺库则建），3306 拒绝连接时降级到内存库。
 * 没有 admin 就用 bootstrap 变量建一个。密码只在环境变量里，不写日志。
 */
import bcrypt from "bcryptjs";
import { loadEnv } from "./config/env.js";
import { createMemoryStore } from "./db/memory.js";
import { createMysqlStore } from "./db/mysql.js";
import type { Store } from "./db/types.js";
import { logError, logInfo } from "./lib/logger.js";
import { registerProcessHandlers } from "./lib/processHandlers.js";
import { createApp } from "./app.js";

registerProcessHandlers();

const BCRYPT_ROUNDS = 10;

function isMysqlDown(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT";
}

async function bootstrapAdmin(store: Store, email: string, password: string) {
  if ((await store.countAdmins()) > 0) return;
  const normalized = email.trim().toLowerCase();
  if (await store.findUserByEmail(normalized)) return;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await store.createUser({
    email: normalized,
    passwordHash,
    displayName: "管理员",
    role: "admin",
  });
  logInfo("admin bootstrap", { created: true });
}

async function openStore(env: ReturnType<typeof loadEnv>): Promise<Store> {
  if (env.storeMode === "memory") {
    logInfo("using memory store", { reason: "ER_STORE=memory" });
    return createMemoryStore();
  }
  try {
    return await createMysqlStore(env);
  } catch (error) {
    if (!isMysqlDown(error)) throw error;
    logError("mysql unavailable, falling back to memory", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return createMemoryStore();
  }
}

async function main() {
  const env = loadEnv();
  const store = await openStore(env);
  await bootstrapAdmin(store, env.adminEmail, env.adminPassword);
  const app = createApp(store, {
    jwtSecret: env.jwtSecret,
    corsOrigin: env.corsOrigin,
  });
  app.listen(env.port, () => {
    logInfo("server listening", { port: env.port });
  });
}

main().catch((error) => {
  logError("startup failed", { name: error instanceof Error ? error.name : "unknown" });
  process.exit(1);
});
