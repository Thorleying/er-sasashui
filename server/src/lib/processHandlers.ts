/**
 * 注册进程级未捕获异常处理，避免静默崩溃；日志经 logger 脱敏输出。
 */
import { logError } from "./logger.js";

export function registerProcessHandlers() {
  process.on("uncaughtException", (error) => {
    logError("uncaughtException", {
      name: error.name,
      message: error.message,
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logError("unhandledRejection", {
      name: reason instanceof Error ? reason.name : "unknown",
      message: reason instanceof Error ? reason.message : String(reason),
    });
  });
}
