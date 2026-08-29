/**
 * 管理端路由。三组接口都要 admin，未登录 401、普通用户 403。
 */
import { Router } from "express";
import type { Store } from "../../db/types.js";
import { asyncHandler } from "../../lib/async.js";
import { requireAdmin } from "../../middleware/auth.js";
import { createAdminController } from "./admin.controller.js";

export function adminRoutes(store: Store, jwtSecret: string) {
  const router = Router();
  const controller = createAdminController(store);
  const guard = requireAdmin(store, jwtSecret);
  router.get("/stats/daily", guard, asyncHandler(controller.daily));
  router.get("/users", guard, asyncHandler(controller.users));
  router.patch("/users/:id/disabled", guard, asyncHandler(controller.setUserDisabled));
  router.get("/ops", guard, asyncHandler(controller.ops));
  router.get("/page-views", guard, asyncHandler(controller.pageViews));
  return router;
}
