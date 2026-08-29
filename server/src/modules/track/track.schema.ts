/**
 * 页面访问上报。visitorId 由前端生成并持久化，path 只收站内路径片段。
 */
import { z } from "zod";

export const trackSchema = z.object({
  visitorId: z.string().trim().min(1).max(64),
  path: z.string().trim().min(1).max(512),
});
