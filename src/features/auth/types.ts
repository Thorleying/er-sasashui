/**
 * 登录态与接口用户。只放前端需要的公开字段，不含密码哈希。
 */
export type UserRole = "user" | "admin";

export type PublicUser = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
};

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};
