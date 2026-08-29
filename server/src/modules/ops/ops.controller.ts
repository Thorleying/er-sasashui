/**
 * 已登录用户上报生成 / 导出。detail 不收 SQL。
 */
import type { Response } from "express";
import type { Store } from "../../db/types.js";
import { Errors } from "../../lib/errors.js";
import { requestAuditMeta } from "../../lib/requestMeta.js";
import type { AuthedRequest } from "../../middleware/auth.js";
import { ok } from "../../middleware/errorHandler.js";
import { createOpSchema } from "./ops.schema.js";

export function createOpsController(store: Store) {
  return {
    create: async (req: AuthedRequest, res: Response) => {
      if (!req.user) throw Errors.unauthorized();
      const body = createOpSchema.parse(req.body);
      const detail = body.detail?.trim() ? body.detail.trim() : null;
      const audit = requestAuditMeta(req);
      const op = await store.insertOp({
        userId: req.user.id,
        action: body.action,
        detail,
        ip: audit.ip,
        userAgent: audit.userAgent,
      });
      ok(res, { id: op.id });
    },
  };
}
