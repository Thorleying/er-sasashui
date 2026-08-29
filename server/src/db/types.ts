/**
 * 持久化契约。MySQL 与内存实现共用，方便单测不依赖 3306。
 */
export type Role = "user" | "admin";
export type OpAction = "register" | "login" | "logout" | "generate_er" | "export" | "share";

/** 分享链接内嵌的 ER 快照（不含缩略图）。 */
export type SharePayload = {
  inputText: string;
  isColored: boolean;
  showComment: boolean;
  hideFields: boolean;
  nodes: Array<{ id: string; x?: number; y?: number; label?: string }>;
};

export type ShareRecord = {
  id: number;
  token: string;
  userId: number;
  title: string | null;
  payload: SharePayload;
  viewCount: number;
  expiresAt: Date | null;
  createdAt: Date;
};

export type PublicShare = {
  token: string;
  title: string | null;
  payload: SharePayload;
  viewCount: number;
  createdAt: string;
};

export type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  disabled: boolean;
  registerIp: string | null;
  lastLoginIp: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export type PublicUser = {
  id: number;
  email: string;
  displayName: string;
  role: Role;
};

export type OpRecord = {
  id: number;
  userId: number;
  action: OpAction;
  detail: string | null;
  ip: string;
  userAgent: string | null;
  createdAt: Date;
};

export type OpListItem = OpRecord & {
  email: string;
  displayName: string;
};

export type DayStat = {
  date: string;
  registerCount: number;
  loginCount: number;
  generateCount: number;
  exportCount: number;
  pvCount: number;
  uvCount: number;
};

export type PageViewRecord = {
  id: number;
  visitorId: string;
  path: string;
  ip: string;
  userAgent: string | null;
  userId: number | null;
  createdAt: Date;
};

export type PageViewListItem = PageViewRecord & {
  email: string | null;
  displayName: string | null;
};

export type PageQuery = {
  page: number;
  pageSize: number;
};

/** 用户列表筛选：关键词匹配邮箱、显示名或 ID。 */
export type UserFilter = PageQuery & {
  q?: string;
  role?: Role;
  disabled?: boolean;
};

export type OpFilter = PageQuery & {
  userId?: number;
  /** 匹配用户邮箱或显示名（模糊）。 */
  q?: string;
  action?: OpAction;
  ip?: string;
  from?: string;
  to?: string;
};

export type PageViewFilter = PageQuery & {
  /** 匹配已登录用户邮箱或显示名（模糊）。 */
  q?: string;
  path?: string;
  ip?: string;
  from?: string;
  to?: string;
};

export interface Store {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: number): Promise<UserRecord | null>;
  createUser(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    role: Role;
    registerIp?: string | null;
  }): Promise<UserRecord>;
  updateLastLogin(id: number, at: Date, ip?: string | null): Promise<void>;
  countAdmins(): Promise<number>;
  listUsers(filter: UserFilter): Promise<{ items: UserRecord[]; total: number }>;
  insertOp(input: {
    userId: number;
    action: OpAction;
    detail: string | null;
    ip: string;
    userAgent?: string | null;
  }): Promise<OpRecord>;
  listOps(filter: OpFilter): Promise<{ items: OpListItem[]; total: number }>;
  dailyStats(from: string, to: string): Promise<DayStat[]>;
  insertPageView(input: {
    visitorId: string;
    path: string;
    ip: string;
    userAgent?: string | null;
    userId?: number;
  }): Promise<PageViewRecord>;
  listPageViews(filter: PageViewFilter): Promise<{ items: PageViewListItem[]; total: number }>;
  setUserDisabled(id: number, disabled: boolean): Promise<void>;
  createShare(input: {
    userId: number;
    token: string;
    title: string | null;
    payload: SharePayload;
    expiresAt: Date | null;
  }): Promise<ShareRecord>;
  findShareByToken(token: string): Promise<ShareRecord | null>;
  incrementShareViews(token: string): Promise<void>;
  deleteShareByToken(token: string, userId: number): Promise<boolean>;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
