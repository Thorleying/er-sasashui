/**
 * 页面访问上报路由。公开接口，不要求登录。
 */
import { Router } from "express";
import type { Store } from "../../db/types.js";
import { asyncHandler } from "../../lib/async.js";
import { createTrackController } from "./track.controller.js";

export function trackRoutes(store: Store, jwtSecret: string) {
  const router = Router();
  const controller = createTrackController(store, jwtSecret);
  router.post("/", asyncHandler(controller.track));
  return router;
}
