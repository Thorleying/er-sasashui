/**
 * 认证 HTTP 边界：读 body / Cookie，调 service，写会话 Cookie。
 */
import type { Request, Response } from "express";
import type { Store } from "../../db/types.js";
import { toPublicUser } from "../../db/types.js";
import { Errors } from "../../lib/errors.js";
import { requestAuditMeta } from "../../lib/requestMeta.js";
import {
  clearSessionCookie,
  optionalUser,
  setSessionCookie,
  type AuthedRequest,
} from "../../middleware/auth.js";
import { ok } from "../../middleware/errorHandler.js";
import { createAuthService } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export function createAuthController(store: Store, jwtSecret: string) {
  const auth = createAuthService(store, jwtSecret);

  return {
    register: async (req: Request, res: Response) => {
      const body = registerSchema.parse(req.body);
      const audit = requestAuditMeta(req);
      const result = await auth.register({ ...body, ...audit });
      setSessionCookie(res, result.token);
      ok(res, result.user);
    },
    login: async (req: Request, res: Response) => {
      const body = loginSchema.parse(req.body);
      const audit = requestAuditMeta(req);
      const result = await auth.login({ ...body, ...audit });
      setSessionCookie(res, result.token);
      ok(res, result.user);
    },
    logout: async (req: AuthedRequest, res: Response) => {
      const user = await optionalUser(req, store, jwtSecret);
      if (user) await auth.logout(user.id, requestAuditMeta(req));
      clearSessionCookie(res);
      ok(res, null);
    },
    me: async (req: AuthedRequest, res: Response) => {
      if (!req.user) throw Errors.unauthorized();
      ok(res, toPublicUser(req.user));
    },
  };
}
