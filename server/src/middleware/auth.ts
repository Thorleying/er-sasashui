/**
 * 登录态与管理员校验。身份只认服务端校验过的 JWT，不信前端传的 userId。
 */
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Store, UserRecord } from "../db/types.js";
import { Errors } from "../lib/errors.js";

export type AuthedRequest = Request & { user?: UserRecord };

export type TokenPayload = {
  sub: number;
  role: string;
};

export function signSession(user: UserRecord, secret: string) {
  return jwt.sign({ sub: user.id, role: user.role } satisfies TokenPayload, secret, {
    expiresIn: "7d",
  });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie("er_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie("er_session", { path: "/" });
}

export function requireUser(store: Store, secret: string) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      req.user = await loadUser(req, store, secret);
      if (!req.user) throw Errors.unauthorized();
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAdmin(store: Store, secret: string) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      req.user = await loadUser(req, store, secret);
      if (!req.user) throw Errors.unauthorized();
      if (req.user.role !== "admin") throw Errors.forbidden();
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function optionalUser(req: AuthedRequest, store: Store, secret: string) {
  req.user = await loadUser(req, store, secret);
  return req.user;
}

async function loadUser(req: Request, store: Store, secret: string) {
  const token = req.cookies?.er_session;
  if (!token || typeof token !== "string") return undefined;
  try {
    const payload = jwt.verify(token, secret) as unknown as TokenPayload;
    const user = await store.findUserById(Number(payload.sub));
    if (!user || user.disabled) return undefined;
    return user;
  } catch {
    return undefined;
  }
}
