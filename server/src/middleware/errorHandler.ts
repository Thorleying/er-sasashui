/**
 * 统一错误出口。Zod 与 AppError 转成契约响应，未知错误不回内部细节。
 */
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logError } from "../lib/logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const first = err.issues[0]?.message || "参数不合法";
    res.status(400).json({ code: 40001, message: first, data: null });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({ code: err.code, message: err.message, data: null });
    return;
  }
  logError("unhandled", { name: err instanceof Error ? err.name : "unknown" });
  res.status(500).json({ code: 50001, message: "服务器内部错误", data: null });
}

export function ok<T>(res: Response, data: T, message = "ok") {
  res.json({ code: 0, message, data });
}
