/**
 * 业务错误：带稳定 code，给统一中间件映射 HTTP 状态。
 */
export class AppError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  constructor(code: number, message: string, httpStatus?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus ?? statusFromCode(code);
  }
}

function statusFromCode(code: number): number {
  if (code >= 50000) return 500;
  if (code >= 40900) return 409;
  if (code >= 40400) return 404;
  if (code >= 40300) return 403;
  if (code >= 40100) return 401;
  if (code >= 40000) return 400;
  return 400;
}

export const Errors = {
  badRequest: (message = "参数不合法") => new AppError(40001, message),
  loginFailed: () => new AppError(40101, "邮箱或密码错误"),
  unauthorized: () => new AppError(40102, "未登录"),
  forbidden: () => new AppError(40301, "需要管理员权限"),
  cannotDisableLastAdmin: () => new AppError(40302, "不能禁用最后一个管理员"),
  userDisabled: () => new AppError(40303, "账号已被禁用"),
  notFound: (message = "资源不存在") => new AppError(40401, message),
  emailTaken: () => new AppError(40901, "邮箱已注册"),
};
