/**
 * 分享链接业务：生成 token、默认 90 天过期、公开读取时累加浏览量。
 */
import { randomBytes } from "node:crypto";
import type { Store } from "../../db/types.js";
import { Errors } from "../../lib/errors.js";
import type { CreateShareBody } from "./share.schema.js";

const SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function newShareToken() {
  return randomBytes(16).toString("hex");
}

function isExpired(expiresAt: Date | null, now = Date.now()) {
  return expiresAt != null && expiresAt.getTime() <= now;
}

export function createShareService(store: Store) {
  return {
    async create(userId: number, body: CreateShareBody) {
      const token = newShareToken();
      const expiresAt = new Date(Date.now() + SHARE_TTL_MS);
      const record = await store.createShare({
        userId,
        token,
        title: body.title?.trim() ? body.title.trim() : null,
        payload: body.payload,
        expiresAt,
      });
      return {
        token: record.token,
        urlPath: `/s/${record.token}`,
        expiresAt: record.expiresAt?.toISOString() ?? null,
      };
    },

    async getPublic(token: string) {
      const normalized = token.trim();
      if (!/^[a-f0-9]{32}$/i.test(normalized)) {
        throw Errors.notFound("分享不存在或已过期");
      }
      const record = await store.findShareByToken(normalized);
      if (!record || isExpired(record.expiresAt)) {
        throw Errors.notFound("分享不存在或已过期");
      }
      await store.incrementShareViews(normalized);
      const updated = await store.findShareByToken(normalized);
      if (!updated) throw Errors.notFound("分享不存在或已过期");
      return {
        token: updated.token,
        title: updated.title,
        payload: updated.payload,
        viewCount: updated.viewCount,
        createdAt: updated.createdAt.toISOString(),
      };
    },

    async revoke(token: string, userId: number) {
      const normalized = token.trim();
      const deleted = await store.deleteShareByToken(normalized, userId);
      if (!deleted) throw Errors.notFound("分享不存在或无权删除");
    },
  };
}
