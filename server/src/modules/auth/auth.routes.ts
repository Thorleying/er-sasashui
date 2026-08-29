/**
 * 认证路由。/me 必须登录；logout 允许匿名，方便清 Cookie。
 */
import { Router } from "express";
import type { Store } from "../../db/types.js";
import { asyncHandler } from "../../lib/async.js";
import { requireUser } from "../../middleware/auth.js";
import { createAuthController } from "./auth.controller.js";

export function authRoutes(store: Store, jwtSecret: string) {
  const router = Router();
  const controller = createAuthController(store, jwtSecret);
  router.post("/register", asyncHandler(controller.register));
  router.post("/login", asyncHandler(controller.login));
  router.post("/logout", asyncHandler(controller.logout));
  router.get("/me", requireUser(store, jwtSecret), asyncHandler(controller.me));
  return router;
}
