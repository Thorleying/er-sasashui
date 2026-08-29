/**
 * Express 组装。Store 由外部注入，单测走内存、进程入口走 MySQL。
 */
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Store } from "./db/types.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { opsRoutes } from "./modules/ops/ops.routes.js";
import { shareRoutes } from "./modules/shares/share.routes.js";
import { trackRoutes } from "./modules/track/track.routes.js";

export type AppConfig = {
  jwtSecret: string;
  corsOrigin: string;
};

/**
 * 挂上 cookie / JSON / CORS 与 /api 路由。不在这里连数据库。
 */
export function createApp(store: Store, config: AppConfig) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "512kb" }));
  app.use(cookieParser());
  app.use("/api/auth", authRoutes(store, config.jwtSecret));
  app.use("/api/ops", opsRoutes(store, config.jwtSecret));
  app.use("/api/shares", shareRoutes(store, config.jwtSecret));
  app.use("/api/track", trackRoutes(store, config.jwtSecret));
  app.use("/api/admin", adminRoutes(store, config.jwtSecret));
  app.use((_req, res) => {
    res.status(404).json({ code: 40401, message: "接口不存在", data: null });
  });
  app.use(errorHandler);
  return app;
}
