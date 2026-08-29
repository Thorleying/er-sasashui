/**
 * 后端日志。邮箱 / token / Cookie / 密码一律不写原文。
 */
export function logInfo(message: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", message, ...sanitize(extra) }));
}

export function logError(message: string, extra?: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", message, ...sanitize(extra) }));
}

function sanitize(extra?: Record<string, unknown>) {
  if (!extra) return {};
  const blocked = new Set(["password", "token", "cookie", "email", "authorization"]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    out[key] = blocked.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  return out;
}
