/**
 * 全站轻量反馈：错误/成功用 antd message，不用 window.alert 或页面内 Alert 条。
 * 需在 AntdProvider 的 App 包裹下使用（main.tsx 已配置）。
 */
import { message } from "antd";

const ERROR_KEY = "app-feedback-error";

/** 展示可读的失败提示，同 key 去重避免连弹。 */
export function showError(content: string) {
  if (!content.trim()) return;
  message.error({ content, key: ERROR_KEY, duration: 4 });
}

/** 成功类短提示（如复制、保存）。 */
export function showSuccess(content: string) {
  if (!content.trim()) return;
  message.success({ content, duration: 3 });
}
