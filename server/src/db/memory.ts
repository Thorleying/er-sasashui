/**
 * 内存 Store，只给单测用。不假装自己是 MySQL。
 */
import type {
  DayStat,
  OpAction,
  OpFilter,
  OpListItem,
  OpRecord,
  PageViewFilter,
  PageViewListItem,
  PageViewRecord,
  Role,
  SharePayload,
  ShareRecord,
  Store,
  UserFilter,
  UserRecord,
} from "./types.js";
import { Errors } from "../lib/errors.js";

export function createMemoryStore(): Store {
  const users: UserRecord[] = [];
  const ops: OpRecord[] = [];
  const pageViews: PageViewRecord[] = [];
  const shares: ShareRecord[] = [];
  let userSeq = 1;
  let opSeq = 1;
  let pageViewSeq = 1;
  let shareSeq = 1;

  return {
    async findUserByEmail(email) {
      return users.find((item) => item.email === email) ?? null;
    },
    async findUserById(id) {
      return users.find((item) => item.id === id) ?? null;
    },
    async createUser(input) {
      const row: UserRecord = {
        id: userSeq++,
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        role: input.role,
        disabled: false,
        registerIp: input.registerIp ?? null,
        lastLoginIp: null,
        createdAt: new Date(),
        lastLoginAt: null,
      };
      users.push(row);
      return row;
    },
    async updateLastLogin(id, at, ip) {
      const user = users.find((item) => item.id === id);
      if (user) {
        user.lastLoginAt = at;
        if (ip) user.lastLoginIp = ip;
      }
    },
    async countAdmins() {
      return users.filter((item) => item.role === "admin").length;
    },
    async listUsers(filter: UserFilter) {
      let rows = users.slice();
      if (filter.q) {
        const q = filter.q.trim().toLowerCase();
        const idMatch = /^\d+$/.test(q) ? Number(q) : null;
        rows = rows.filter(
          (user) =>
            user.email.toLowerCase().includes(q) ||
            user.displayName.toLowerCase().includes(q) ||
            (idMatch !== null && user.id === idMatch),
        );
      }
      if (filter.role) rows = rows.filter((user) => user.role === filter.role);
      if (filter.disabled !== undefined) {
        rows = rows.filter((user) => user.disabled === filter.disabled);
      }
      rows.sort((a, b) => b.id - a.id);
      const start = (filter.page - 1) * filter.pageSize;
      return { total: rows.length, items: rows.slice(start, start + filter.pageSize) };
    },
    async insertOp(input) {
      const row: OpRecord = {
        id: opSeq++,
        userId: input.userId,
        action: input.action,
        detail: input.detail,
        ip: input.ip,
        userAgent: input.userAgent ?? null,
        createdAt: new Date(),
      };
      ops.push(row);
      return row;
    },
    async listOps(filter: OpFilter) {
      let rows: OpListItem[] = ops.map((op) => {
        const user = users.find((item) => item.id === op.userId);
        return {
          ...op,
          email: user?.email ?? "",
          displayName: user?.displayName ?? "",
        };
      });
      if (filter.userId) rows = rows.filter((item) => item.userId === filter.userId);
      if (filter.q) {
        const q = filter.q.trim().toLowerCase();
        rows = rows.filter(
          (item) =>
            item.email.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q),
        );
      }
      if (filter.action) rows = rows.filter((item) => item.action === filter.action);
      if (filter.ip) {
        const ipQ = filter.ip.trim().toLowerCase();
        rows = rows.filter((item) => item.ip.toLowerCase().includes(ipQ));
      }
      if (filter.from) rows = rows.filter((item) => ymd(item.createdAt) >= filter.from!);
      if (filter.to) rows = rows.filter((item) => ymd(item.createdAt) <= filter.to!);
      rows.sort((a, b) => b.id - a.id);
      const start = (filter.page - 1) * filter.pageSize;
      return { total: rows.length, items: rows.slice(start, start + filter.pageSize) };
    },
    async dailyStats(from, to) {
      const days = enumerateDays(from, to);
      return days.map((date) => {
        const dayOps = ops.filter((item) => ymd(item.createdAt) === date);
        const dayViews = pageViews.filter((item) => ymd(item.createdAt) === date);
        const visitors = new Set(dayViews.map((item) => item.visitorId));
        return {
          date,
          registerCount: countAction(dayOps, "register"),
          loginCount: countAction(dayOps, "login"),
          generateCount: countAction(dayOps, "generate_er"),
          exportCount: countAction(dayOps, "export"),
          pvCount: dayViews.length,
          uvCount: visitors.size,
        };
      });
    },
    async insertPageView(input) {
      const row: PageViewRecord = {
        id: pageViewSeq++,
        visitorId: input.visitorId,
        path: input.path,
        ip: input.ip,
        userAgent: input.userAgent ?? null,
        userId: input.userId ?? null,
        createdAt: new Date(),
      };
      pageViews.push(row);
      return row;
    },
    async listPageViews(filter: PageViewFilter) {
      let rows: PageViewListItem[] = pageViews.map((view) => {
        const user = view.userId ? users.find((item) => item.id === view.userId) : null;
        return {
          ...view,
          email: user?.email ?? null,
          displayName: user?.displayName ?? null,
        };
      });
      if (filter.q) {
        const q = filter.q.trim().toLowerCase();
        rows = rows.filter(
          (item) =>
            (item.email && item.email.toLowerCase().includes(q)) ||
            (item.displayName && item.displayName.toLowerCase().includes(q)),
        );
      }
      if (filter.path) {
        const pathQ = filter.path.trim().toLowerCase();
        rows = rows.filter((item) => item.path.toLowerCase().includes(pathQ));
      }
      if (filter.ip) {
        const ipQ = filter.ip.trim().toLowerCase();
        rows = rows.filter((item) => item.ip.toLowerCase().includes(ipQ));
      }
      if (filter.from) rows = rows.filter((item) => ymd(item.createdAt) >= filter.from!);
      if (filter.to) rows = rows.filter((item) => ymd(item.createdAt) <= filter.to!);
      rows.sort((a, b) => b.id - a.id);
      const start = (filter.page - 1) * filter.pageSize;
      return { total: rows.length, items: rows.slice(start, start + filter.pageSize) };
    },
    async setUserDisabled(id, disabled) {
      const user = users.find((item) => item.id === id);
      if (!user) throw Errors.notFound("用户不存在");
      if (disabled && user.role === "admin") {
        const activeAdmins = users.filter((item) => item.role === "admin" && !item.disabled);
        if (activeAdmins.length <= 1 && !user.disabled) {
          throw Errors.cannotDisableLastAdmin();
        }
      }
      user.disabled = disabled;
    },
    async createShare(input) {
      const row: ShareRecord = {
        id: shareSeq++,
        token: input.token,
        userId: input.userId,
        title: input.title,
        payload: input.payload,
        viewCount: 0,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
      };
      shares.push(row);
      return row;
    },
    async findShareByToken(token) {
      return shares.find((item) => item.token === token) ?? null;
    },
    async incrementShareViews(token) {
      const row = shares.find((item) => item.token === token);
      if (row) row.viewCount += 1;
    },
    async deleteShareByToken(token, userId) {
      const index = shares.findIndex((item) => item.token === token && item.userId === userId);
      if (index < 0) return false;
      shares.splice(index, 1);
      return true;
    },
  };
}

function countAction(rows: OpRecord[], action: OpAction) {
  return rows.filter((item) => item.action === action).length;
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function enumerateDays(from: string, to: string) {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function ensureBootstrapAdmin(
  store: Store,
  input: { email: string; passwordHash: string; displayName: string; role: Role },
) {
  if ((await store.countAdmins()) > 0) return;
  const existing = await store.findUserByEmail(input.email);
  if (existing) return;
  await store.createUser(input);
}
