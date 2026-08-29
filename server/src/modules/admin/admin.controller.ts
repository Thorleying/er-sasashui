/**
 * 管理端 HTTP 边界：解析 query，转给 service，不碰 SQL。
 */
import type { Response } from "express";
import type { Store } from "../../db/types.js";
import type { AuthedRequest } from "../../middleware/auth.js";
import { Errors } from "../../lib/errors.js";
import { ok } from "../../middleware/errorHandler.js";
import { dailySchema, opsQuerySchema, pageViewsQuerySchema, setUserDisabledSchema, usersQuerySchema } from "./admin.schema.js";
import { createAdminService } from "./admin.service.js";

export function createAdminController(store: Store) {
  const admin = createAdminService(store);

  return {
    daily: async (req: AuthedRequest, res: Response) => {
      const query = dailySchema.parse(req.query);
      ok(res, await admin.daily(query.from, query.to));
    },
    users: async (req: AuthedRequest, res: Response) => {
      const query = usersQuerySchema.parse(req.query);
      ok(res, await admin.users(query));
    },
    ops: async (req: AuthedRequest, res: Response) => {
      const query = opsQuerySchema.parse(req.query);
      ok(res, await admin.ops({
        page: query.page,
        pageSize: query.pageSize,
        userId: query.userId,
        q: query.q,
        action: query.action,
        ip: query.ip,
        from: query.from,
        to: query.to,
      }));
    },
    pageViews: async (req: AuthedRequest, res: Response) => {
      const query = pageViewsQuerySchema.parse(req.query);
      ok(res, await admin.pageViews({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        path: query.path,
        ip: query.ip,
        from: query.from,
        to: query.to,
      }));
    },
    setUserDisabled: async (req: AuthedRequest, res: Response) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) throw Errors.badRequest("用户 id 不合法");
      const body = setUserDisabledSchema.parse(req.body);
      ok(res, await admin.setUserDisabled(id, body.disabled));
    },
  };
}
