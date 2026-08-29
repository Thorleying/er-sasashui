/**
 * 集中读取并校验后端环境变量。
 * 业务模块禁止再散落 process.env，缺关键项必须启动失败。
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(serverDir, ".env") });

export type AppEnv = {
  port: number;
  storeMode: "mysql" | "memory";
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
  jwtSecret: string;
  adminEmail: string;
  adminPassword: string;
  corsOrigin: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量 ${name}，拒绝启动`);
  }
  return value;
}

/** 读取并校验运行配置。密码只留在内存，不回写日志。 */
export function loadEnv(): AppEnv {
  const storeMode = process.env.ER_STORE === "memory" ? "memory" : "mysql";
  return {
    port: Number(process.env.PORT || 3001),
    storeMode,
    mysqlHost: process.env.MYSQL_HOST || "127.0.0.1",
    mysqlPort: Number(process.env.MYSQL_PORT || 3306),
    mysqlUser: process.env.MYSQL_USER || "root",
    mysqlPassword: storeMode === "memory" ? process.env.MYSQL_PASSWORD || "" : required("MYSQL_PASSWORD"),
    mysqlDatabase: process.env.MYSQL_DATABASE || "er_sasashui",
    jwtSecret: required("JWT_SECRET"),
    adminEmail: required("ADMIN_BOOTSTRAP_EMAIL"),
    adminPassword: required("ADMIN_BOOTSTRAP_PASSWORD"),
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  };
}
