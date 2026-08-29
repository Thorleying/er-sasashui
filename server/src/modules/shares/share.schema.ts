/**
 * 分享链接请求校验。payload 含 SQL/DBML 原文，仅用于只读展示。
 */
import { z } from "zod";

const nodeSchema = z.object({
  id: z.string().min(1).max(128),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  label: z.string().max(512).optional(),
});

export const sharePayloadSchema = z.object({
  inputText: z.string().min(1).max(200_000),
  isColored: z.boolean(),
  showComment: z.boolean(),
  hideFields: z.boolean(),
  nodes: z.array(nodeSchema).max(800),
});

export const createShareSchema = z.object({
  title: z.string().trim().max(80).optional(),
  payload: sharePayloadSchema,
});

export type CreateShareBody = z.infer<typeof createShareSchema>;
