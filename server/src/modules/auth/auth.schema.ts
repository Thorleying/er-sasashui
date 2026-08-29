/**
 * 注册 / 登录入参。密码长度上限 72 是 bcrypt 截断边界。
 */
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").max(255),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码过长"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").max(255),
  password: z.string().min(1, "请填写密码").max(72),
});
