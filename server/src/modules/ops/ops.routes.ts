/**
 * 操作上报路由，必须登录。
 */
import { Router } from "express";
import type { Store } from "../../db/types.js";
import { asyncHandler } from "../../lib/async.js";
import { requireUser } from "../../middleware/auth.js";
import { createOpsController } from "./ops.controller.js";

export function opsRoutes(store: Store, jwtSecret: string) {
  const router = Router();
  const controller = createOpsController(store);
  router.post("/", requireUser(store, jwtSecret), asyncHandler(controller.create));
  return router;
}
