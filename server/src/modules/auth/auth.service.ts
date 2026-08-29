/**
 * 注册登录用例。密码哈希与 Cookie 签发都在这里，路由不碰 bcrypt。
 */
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Store } from "../../db/types.js";
import { toPublicUser } from "../../db/types.js";
import { Errors } from "../../lib/errors.js";
import { signSession } from "../../middleware/auth.js";

const BCRYPT_ROUNDS = 10;

/** 注册不收集昵称，显示名固定为「用户」加四位数字。 */
function randomDisplayName() {
  return `用户${randomInt(1000, 10000)}`;
}

type AuthAudit = {
  ip: string;
  userAgent?: string | null;
};

export function createAuthService(store: Store, jwtSecret: string) {
  return {
    async register(input: { email: string; password: string } & AuthAudit) {
      const email = input.email.trim().toLowerCase();
      if (await store.findUserByEmail(email)) throw Errors.emailTaken();
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      const user = await store.createUser({
        email,
        passwordHash,
        displayName: randomDisplayName(),
        role: "user",
        registerIp: input.ip,
      });
      await store.insertOp({
        userId: user.id,
        action: "register",
        detail: null,
        ip: input.ip,
        userAgent: input.userAgent,
      });
      const now = new Date();
      await store.updateLastLogin(user.id, now, input.ip);
      user.lastLoginAt = now;
      user.lastLoginIp = input.ip;
      return { user: toPublicUser(user), token: signSession(user, jwtSecret) };
    },

    async login(input: { email: string; password: string } & AuthAudit) {
      const email = input.email.trim().toLowerCase();
      const user = await store.findUserByEmail(email);
      if (!user) throw Errors.loginFailed();
      if (user.disabled) throw Errors.userDisabled();
      const matched = await bcrypt.compare(input.password, user.passwordHash);
      if (!matched) throw Errors.loginFailed();
      const now = new Date();
      await store.updateLastLogin(user.id, now, input.ip);
      user.lastLoginAt = now;
      user.lastLoginIp = input.ip;
      await store.insertOp({
        userId: user.id,
        action: "login",
        detail: null,
        ip: input.ip,
        userAgent: input.userAgent,
      });
      return { user: toPublicUser(user), token: signSession(user, jwtSecret) };
    },

    async logout(userId: number, audit: AuthAudit) {
      await store.insertOp({
        userId,
        action: "logout",
        detail: null,
        ip: audit.ip,
        userAgent: audit.userAgent,
      });
    },
  };
}
