/**
 * 公开 PV 上报。已登录时附带 userId，未登录只记 visitorId。
 */
import type { Response } from "express";
import type { Store } from "../../db/types.js";
import { requestAuditMeta } from "../../lib/requestMeta.js";
import { optionalUser, type AuthedRequest } from "../../middleware/auth.js";
import { ok } from "../../middleware/errorHandler.js";
import { trackSchema } from "./track.schema.js";

export function createTrackController(store: Store, jwtSecret: string) {
  return {
    track: async (req: AuthedRequest, res: Response) => {
      const body = trackSchema.parse(req.body);
      const user = await optionalUser(req, store, jwtSecret);
      const audit = requestAuditMeta(req);
      const row = await store.insertPageView({
        visitorId: body.visitorId,
        path: body.path,
        ip: audit.ip,
        userAgent: audit.userAgent,
        userId: user?.id,
      });
      ok(res, { id: row.id });
    },
  };
}
