/**
 * MySQL 连接、建库、可重复 migration。
 * 连不上 3306 时原样抛错，不降级成内存库。
 */
import mysql from "mysql2/promise";
import type { AppEnv } from "../config/env.js";
import { logInfo } from "../lib/logger.js";
import type {
  DayStat,
  OpFilter,
  OpListItem,
  OpRecord,
  PageViewFilter,
  PageViewListItem,
  PageViewRecord,
  SharePayload,
  ShareRecord,
  Store,
  UserFilter,
  UserRecord,
} from "./types.js";
import { Errors } from "../lib/errors.js";

export async function createMysqlStore(env: AppEnv): Promise<Store> {
  const root = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
  });
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.mysqlDatabase}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await root.end();

  const pool = mysql.createPool({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 8,
  });

  await migrate(pool);
  logInfo("mysql ready", { database: env.mysqlDatabase });
  return wrapPool(pool);
}

async function migrate(pool: mysql.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(32) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      last_login_at DATETIME(3) NULL
    )
  `);
  if (!(await columnExists(pool, "users", "disabled"))) {
    await pool.query(
      "ALTER TABLE users ADD COLUMN disabled TINYINT(1) NOT NULL DEFAULT 0 AFTER role",
    );
  }
  if (!(await columnExists(pool, "users", "register_ip"))) {
    await pool.query("ALTER TABLE users ADD COLUMN register_ip VARCHAR(64) NULL AFTER disabled");
  }
  if (!(await columnExists(pool, "users", "last_login_ip"))) {
    await pool.query("ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(64) NULL AFTER last_login_at");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ops (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      action VARCHAR(32) NOT NULL,
      detail_json VARCHAR(255) NULL,
      ip VARCHAR(64) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_ops_user (user_id),
      INDEX idx_ops_action_time (action, created_at),
      CONSTRAINT fk_ops_user FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  if (!(await columnExists(pool, "ops", "user_agent"))) {
    await pool.query("ALTER TABLE ops ADD COLUMN user_agent VARCHAR(512) NULL AFTER ip");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_views (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      visitor_id VARCHAR(64) NOT NULL,
      path VARCHAR(512) NOT NULL,
      ip VARCHAR(64) NOT NULL,
      user_id BIGINT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_page_views_time (created_at),
      INDEX idx_page_views_visitor_time (visitor_id, created_at),
      CONSTRAINT fk_page_views_user FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  if (!(await columnExists(pool, "page_views", "user_agent"))) {
    await pool.query(
      "ALTER TABLE page_views ADD COLUMN user_agent VARCHAR(512) NULL AFTER ip",
    );
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shares (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      token VARCHAR(32) NOT NULL UNIQUE,
      user_id BIGINT NOT NULL,
      title VARCHAR(80) NULL,
      payload_json MEDIUMTEXT NOT NULL,
      view_count INT NOT NULL DEFAULT 0,
      expires_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_shares_user (user_id),
      CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

/** 通过 information_schema 判断列是否已存在，避免重复 ALTER。 */
async function columnExists(pool: mysql.Pool, table: string, column: string) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

function wrapPool(pool: mysql.Pool): Store {
  return {
    async findUserByEmail(email) {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email],
      );
      return rows[0] ? mapUser(rows[0]) : null;
    },
    async findUserById(id) {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [id],
      );
      return rows[0] ? mapUser(rows[0]) : null;
    },
    async createUser(input) {
      const [result] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO users (email, password_hash, display_name, role, register_ip) VALUES (?, ?, ?, ?, ?)",
        [input.email, input.passwordHash, input.displayName, input.role, input.registerIp ?? null],
      );
      const created = await this.findUserById(result.insertId);
      if (!created) throw new Error("创建用户后读回失败");
      return created;
    },
    async updateLastLogin(id, at, ip) {
      if (ip) {
        await pool.query("UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ?", [
          at,
          ip,
          id,
        ]);
        return;
      }
      await pool.query("UPDATE users SET last_login_at = ? WHERE id = ?", [at, id]);
    },
    async countAdmins() {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'",
      );
      return Number(rows[0]?.c ?? 0);
    },
    async listUsers(filter: UserFilter) {
      const where: string[] = [];
      const args: unknown[] = [];
      if (filter.q) {
        const q = filter.q.trim();
        const idMatch = /^\d+$/.test(q) ? Number(q) : null;
        if (idMatch !== null) {
          where.push("(id = ? OR email LIKE ? OR display_name LIKE ?)");
          args.push(idMatch, `%${q}%`, `%${q}%`);
        } else {
          where.push("(email LIKE ? OR display_name LIKE ?)");
          args.push(`%${q}%`, `%${q}%`);
        }
      }
      if (filter.role) {
        where.push("role = ?");
        args.push(filter.role);
      }
      if (filter.disabled !== undefined) {
        where.push("disabled = ?");
        args.push(filter.disabled ? 1 : 0);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const [countRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM users ${clause}`,
        args,
      );
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT * FROM users ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...args, filter.pageSize, (filter.page - 1) * filter.pageSize],
      );
      return { total: Number(countRows[0]?.c ?? 0), items: rows.map(mapUser) };
    },
    async insertOp(input) {
      const [result] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO ops (user_id, action, detail_json, ip, user_agent) VALUES (?, ?, ?, ?, ?)",
        [input.userId, input.action, input.detail, input.ip, input.userAgent ?? null],
      );
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM ops WHERE id = ? LIMIT 1",
        [result.insertId],
      );
      return mapOp(rows[0]);
    },
    async listOps(filter: OpFilter) {
      const where: string[] = [];
      const args: unknown[] = [];
      if (filter.userId) {
        where.push("o.user_id = ?");
        args.push(filter.userId);
      }
      if (filter.q) {
        where.push("(u.email LIKE ? OR u.display_name LIKE ?)");
        const like = `%${filter.q.trim()}%`;
        args.push(like, like);
      }
      if (filter.action) {
        where.push("o.action = ?");
        args.push(filter.action);
      }
      if (filter.ip) {
        where.push("o.ip LIKE ?");
        args.push(`%${filter.ip.trim()}%`);
      }
      if (filter.from) {
        where.push("DATE(o.created_at) >= ?");
        args.push(filter.from);
      }
      if (filter.to) {
        where.push("DATE(o.created_at) <= ?");
        args.push(filter.to);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const [countRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM ops o JOIN users u ON u.id = o.user_id ${clause}`,
        args,
      );
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT o.*, u.email, u.display_name
         FROM ops o JOIN users u ON u.id = o.user_id
         ${clause}
         ORDER BY o.id DESC
         LIMIT ? OFFSET ?`,
        [...args, filter.pageSize, (filter.page - 1) * filter.pageSize],
      );
      return {
        total: Number(countRows[0]?.c ?? 0),
        items: rows.map(mapOpList),
      };
    },
    async dailyStats(from, to) {
      const [opRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT DATE(created_at) AS date,
                SUM(action = 'register') AS registerCount,
                SUM(action = 'login') AS loginCount,
                SUM(action = 'generate_er') AS generateCount,
                SUM(action = 'export') AS exportCount
         FROM ops
         WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [from, to],
      );
      const [pvRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT DATE(created_at) AS date,
                COUNT(*) AS pvCount,
                COUNT(DISTINCT visitor_id) AS uvCount
         FROM page_views
         WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [from, to],
      );
      const map = new Map<string, DayStat>();
      for (const row of opRows) {
        const date = formatDate(row.date);
        map.set(date, emptyDayStat(date, {
          registerCount: Number(row.registerCount ?? 0),
          loginCount: Number(row.loginCount ?? 0),
          generateCount: Number(row.generateCount ?? 0),
          exportCount: Number(row.exportCount ?? 0),
        }));
      }
      for (const row of pvRows) {
        const date = formatDate(row.date);
        const existing = map.get(date) ?? emptyDayStat(date);
        existing.pvCount = Number(row.pvCount ?? 0);
        existing.uvCount = Number(row.uvCount ?? 0);
        map.set(date, existing);
      }
      return fillDays(from, to, map);
    },
    async insertPageView(input) {
      const [result] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO page_views (visitor_id, path, ip, user_agent, user_id) VALUES (?, ?, ?, ?, ?)",
        [
          input.visitorId,
          input.path,
          input.ip,
          input.userAgent ?? null,
          input.userId ?? null,
        ],
      );
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM page_views WHERE id = ? LIMIT 1",
        [result.insertId],
      );
      return mapPageView(rows[0]);
    },
    async listPageViews(filter: PageViewFilter) {
      const where: string[] = [];
      const args: unknown[] = [];
      if (filter.q) {
        where.push("(u.email LIKE ? OR u.display_name LIKE ?)");
        const like = `%${filter.q.trim()}%`;
        args.push(like, like);
      }
      if (filter.path) {
        where.push("pv.path LIKE ?");
        args.push(`%${filter.path.trim()}%`);
      }
      if (filter.ip) {
        where.push("pv.ip LIKE ?");
        args.push(`%${filter.ip.trim()}%`);
      }
      if (filter.from) {
        where.push("DATE(pv.created_at) >= ?");
        args.push(filter.from);
      }
      if (filter.to) {
        where.push("DATE(pv.created_at) <= ?");
        args.push(filter.to);
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const [countRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS c
         FROM page_views pv
         LEFT JOIN users u ON u.id = pv.user_id
         ${clause}`,
        args,
      );
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT pv.*, u.email, u.display_name
         FROM page_views pv
         LEFT JOIN users u ON u.id = pv.user_id
         ${clause}
         ORDER BY pv.id DESC
         LIMIT ? OFFSET ?`,
        [...args, filter.pageSize, (filter.page - 1) * filter.pageSize],
      );
      return {
        total: Number(countRows[0]?.c ?? 0),
        items: rows.map(mapPageViewList),
      };
    },
    async setUserDisabled(id, disabled) {
      const user = await this.findUserById(id);
      if (!user) throw Errors.notFound("用户不存在");
      if (disabled && user.role === "admin") {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(
          "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND disabled = 0",
        );
        const activeAdmins = Number(rows[0]?.c ?? 0);
        if (activeAdmins <= 1 && !user.disabled) {
          throw Errors.cannotDisableLastAdmin();
        }
      }
      await pool.query("UPDATE users SET disabled = ? WHERE id = ?", [disabled ? 1 : 0, id]);
    },
    async createShare(input) {
      const [result] = await pool.query<mysql.ResultSetHeader>(
        "INSERT INTO shares (token, user_id, title, payload_json, expires_at) VALUES (?, ?, ?, ?, ?)",
        [
          input.token,
          input.userId,
          input.title,
          JSON.stringify(input.payload),
          input.expiresAt,
        ],
      );
      void result;
      const created = await this.findShareByToken(input.token);
      if (!created) throw new Error("创建分享后读回失败");
      return created;
    },
    async findShareByToken(token) {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT * FROM shares WHERE token = ? LIMIT 1",
        [token],
      );
      return rows[0] ? mapShare(rows[0]) : null;
    },
    async incrementShareViews(token) {
      await pool.query("UPDATE shares SET view_count = view_count + 1 WHERE token = ?", [token]);
    },
    async deleteShareByToken(token, userId) {
      const [result] = await pool.query<mysql.ResultSetHeader>(
        "DELETE FROM shares WHERE token = ? AND user_id = ?",
        [token, userId],
      );
      return result.affectedRows > 0;
    },
  };
}

function mapUser(row: mysql.RowDataPacket): UserRecord {
  return {
    id: Number(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    displayName: String(row.display_name),
    role: row.role === "admin" ? "admin" : "user",
    disabled: Boolean(row.disabled),
    registerIp: row.register_ip ? String(row.register_ip) : null,
    lastLoginIp: row.last_login_ip ? String(row.last_login_ip) : null,
    createdAt: new Date(row.created_at),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
  };
}

function mapOp(row: mysql.RowDataPacket): OpRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    action: row.action,
    detail: row.detail_json ?? null,
    ip: String(row.ip),
    userAgent: row.user_agent ? String(row.user_agent) : null,
    createdAt: new Date(row.created_at),
  };
}

function mapOpList(row: mysql.RowDataPacket): OpListItem {
  return {
    ...mapOp(row),
    email: String(row.email),
    displayName: String(row.display_name),
  };
}

function mapPageView(row: mysql.RowDataPacket): PageViewRecord {
  return {
    id: Number(row.id),
    visitorId: String(row.visitor_id),
    path: String(row.path),
    ip: String(row.ip),
    userAgent: row.user_agent ? String(row.user_agent) : null,
    userId: row.user_id == null ? null : Number(row.user_id),
    createdAt: new Date(row.created_at),
  };
}

function mapPageViewList(row: mysql.RowDataPacket): PageViewListItem {
  return {
    ...mapPageView(row),
    email: row.email ? String(row.email) : null,
    displayName: row.display_name ? String(row.display_name) : null,
  };
}

function mapShare(row: mysql.RowDataPacket): ShareRecord {
  let payload: SharePayload;
  try {
    payload = JSON.parse(String(row.payload_json)) as SharePayload;
  } catch {
    throw new Error("分享数据损坏");
  }
  return {
    id: Number(row.id),
    token: String(row.token),
    userId: Number(row.user_id),
    title: row.title ? String(row.title) : null,
    payload,
    viewCount: Number(row.view_count ?? 0),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
  };
}

function emptyDayStat(
  date: string,
  partial: Partial<Omit<DayStat, "date" | "pvCount" | "uvCount">> = {},
): DayStat {
  return {
    date,
    registerCount: 0,
    loginCount: 0,
    generateCount: 0,
    exportCount: 0,
    pvCount: 0,
    uvCount: 0,
    ...partial,
  };
}

function formatDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function fillDays(from: string, to: string, map: Map<string, DayStat>): DayStat[] {
  const days: DayStat[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    days.push(
      map.get(date) ?? emptyDayStat(date),
    );
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
