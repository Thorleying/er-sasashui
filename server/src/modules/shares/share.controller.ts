/**
 * 分享链接 HTTP 层：创建需登录，读取公开，删除限创建者。
 */
import type { Response } from "express";
import type { Store } from "../../db/types.js";
import { Errors } from "../../lib/errors.js";
import { requestAuditMeta } from "../../lib/requestMeta.js";
import type { AuthedRequest } from "../../middleware/auth.js";
import { ok } from "../../middleware/errorHandler.js";
import { createShareSchema } from "./share.schema.js";
import { createShareService } from "./share.service.js";

export function createShareController(store: Store) {
  const service = createShareService(store);

  return {
    create: async (req: AuthedRequest, res: Response) => {
      if (!req.user) throw Errors.unauthorized();
      const body = createShareSchema.parse(req.body);
      const created = await service.create(req.user.id, body);
      const audit = requestAuditMeta(req);
      await store.insertOp({
        userId: req.user.id,
        action: "share",
        detail: created.token.slice(0, 8),
        ip: audit.ip,
        userAgent: audit.userAgent,
      });
      ok(res, created);
    },

    getPublic: async (req: AuthedRequest, res: Response) => {
      const token = String(req.params.token ?? "");
      const data = await service.getPublic(token);
      ok(res, data);
    },

    revoke: async (req: AuthedRequest, res: Response) => {
      if (!req.user) throw Errors.unauthorized();
      const token = String(req.params.token ?? "");
      await service.revoke(token, req.user.id);
      ok(res, null);
    },
  };
}
