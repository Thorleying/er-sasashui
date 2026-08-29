/**
 * 客户端上报的操作。detail 只收短标签，拒绝 SQL 原文。
 */
import { z } from "zod";

export const createOpSchema = z.object({
  action: z.enum(["generate_er", "export"]),
  detail: z.string().trim().max(32).nullable().optional(),
});
