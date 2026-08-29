/**
 * 管理端查询参数。分页有上限，避免一次拉全表。
 */
import { z } from "zod";

/** 查询串空值按「未传」处理，避免 `userId=` 被 coerce 成 0。 */
function emptyAsUndefined(value: unknown) {
  if (value === "" || value === undefined || value === null) return undefined;
  return value;
}

export const pageSchema = z.object({
  page: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1).max(100).default(20)),
});

export const dailySchema = z.object({
  from: z.preprocess(emptyAsUndefined, z.string().date().optional()),
  to: z.preprocess(emptyAsUndefined, z.string().date().optional()),
});

export const setUserDisabledSchema = z.object({
  disabled: z.boolean(),
});

export const usersQuerySchema = pageSchema.extend({
  q: z.preprocess(emptyAsUndefined, z.string().trim().max(100).optional()),
  role: z.preprocess(emptyAsUndefined, z.enum(["user", "admin"]).optional()),
  disabled: z.preprocess(
    emptyAsUndefined,
    z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
  ),
});

export const opsQuerySchema = pageSchema.extend({
  userId: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().optional()),
  q: z.preprocess(emptyAsUndefined, z.string().trim().max(100).optional()),
  action: z.preprocess(
    emptyAsUndefined,
    z.enum(["register", "login", "logout", "generate_er", "export"]).optional(),
  ),
  ip: z.preprocess(emptyAsUndefined, z.string().trim().max(64).optional()),
  from: z.preprocess(emptyAsUndefined, z.string().date().optional()),
  to: z.preprocess(emptyAsUndefined, z.string().date().optional()),
});

export const pageViewsQuerySchema = pageSchema.extend({
  q: z.preprocess(emptyAsUndefined, z.string().trim().max(100).optional()),
  path: z.preprocess(emptyAsUndefined, z.string().trim().max(255).optional()),
  ip: z.preprocess(emptyAsUndefined, z.string().trim().max(64).optional()),
  from: z.preprocess(emptyAsUndefined, z.string().date().optional()),
  to: z.preprocess(emptyAsUndefined, z.string().date().optional()),
});

/** 缺省近 7 天（含今天），用 UTC 日期对齐契约。 */
export function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
