/**
 * 前端 PV 埋点。visitorId 存 localStorage，路由切换时 POST /api/track。
 * 失败静默，不阻塞页面。
 */
const VISITOR_ID_KEY = "er-visitor-id";

/** 取或生成访客 ID，同浏览器持久化。 */
function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    // localStorage 不可用时仍上报，后端可退化为 IP/会话维度
    return crypto.randomUUID();
  }
}

/** 上报一次页面浏览。path 通常为 location.pathname。 */
export function trackPageView(path: string) {
  const normalized = path.trim() || "/";
  void fetch("/api/track", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: normalized, visitorId: getOrCreateVisitorId() }),
  }).catch(() => {
    // 埋点失败不影响主流程
  });
}
