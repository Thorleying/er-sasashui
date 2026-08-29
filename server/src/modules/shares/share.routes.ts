/**
 * /api/shares 路由。创建/删除需登录；GET 公开只读。
 */
import { Router } from "express";
import type { Store } from "../../db/types.js";
import { asyncHandler } from "../../lib/async.js";
import { requireUser } from "../../middleware/auth.js";
import { createShareController } from "./share.controller.js";

export function shareRoutes(store: Store, jwtSecret: string) {
  const router = Router();
  const controller = createShareController(store);
  router.post("/", requireUser(store, jwtSecret), asyncHandler(controller.create));
  router.get("/:token", asyncHandler(controller.getPublic));
  router.delete("/:token", requireUser(store, jwtSecret), asyncHandler(controller.revoke));
  return router;
}
