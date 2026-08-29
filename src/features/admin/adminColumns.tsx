/**
 * 管理端表格列。纯函数，不发请求；用户操作列由页面传入回调。
 */
import { Button, Popconfirm, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AdminOp, AdminPageView, AdminUser, DayStat } from "./api";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

const ACTION_LABEL: Record<string, string> = {
  register: "注册",
  login: "登录",
  logout: "退出",
  generate_er: "生成 ER",
  export: "导出",
};

export function createDailyColumns(): ColumnsType<DayStat> {
  return [
    { title: "日期", dataIndex: "date", key: "date" },
    { title: "PV", dataIndex: "pvCount", key: "pvCount" },
    { title: "UV", dataIndex: "uvCount", key: "uvCount" },
    { title: "新用户", dataIndex: "registerCount", key: "registerCount" },
    { title: "生成", dataIndex: "generateCount", key: "generateCount" },
    { title: "导出", dataIndex: "exportCount", key: "exportCount" },
    { title: "登录", dataIndex: "loginCount", key: "loginCount" },
  ];
}

export type UserColumnsOptions = {
  /** 切换禁用状态；由页面负责请求与刷新列表。 */
  onToggleDisabled: (user: AdminUser, disabled: boolean) => void;
};

export function createUserColumns(options: UserColumnsOptions): ColumnsType<AdminUser> {
  const { onToggleDisabled } = options;
  return [
    { title: "ID", dataIndex: "id", key: "id", width: 72 },
    { title: "显示名", dataIndex: "displayName", key: "displayName" },
    { title: "邮箱", dataIndex: "email", key: "email" },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      render: (role: AdminUser["role"]) => (role === "admin" ? "管理员" : "用户"),
    },
    {
      title: "状态",
      dataIndex: "disabled",
      key: "disabled",
      render: (disabled: boolean) =>
        disabled ? <Tag color="error">已禁用</Tag> : <Tag color="success">正常</Tag>,
    },
    {
      title: "注册时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => formatTime(value),
    },
    {
      title: "最近登录",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: (value: string | null) => (value ? formatTime(value) : "—"),
    },
    {
      title: "注册 IP",
      dataIndex: "registerIp",
      key: "registerIp",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "最近登录 IP",
      dataIndex: "lastLoginIp",
      key: "lastLoginIp",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "操作",
      key: "action",
      render: (_, row) => {
        if (row.role === "admin") return "—";
        const nextDisabled = !row.disabled;
        return (
          <Popconfirm
            title={nextDisabled ? "确定禁用该用户？" : "确定启用该用户？"}
            okText={nextDisabled ? "禁用" : "启用"}
            cancelText="取消"
            onConfirm={() => onToggleDisabled(row, nextDisabled)}
          >
            <Button type="link" size="small" danger={nextDisabled}>
              {row.disabled ? "启用" : "禁用"}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];
}

export function createOpColumns(): ColumnsType<AdminOp> {
  return [
    {
      title: "时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => formatTime(value),
    },
    {
      title: "用户",
      key: "user",
      render: (_, row) => row.displayName || row.email,
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      render: (action: string) => ACTION_LABEL[action] ?? action,
    },
    {
      title: "明细",
      dataIndex: "detail",
      key: "detail",
      render: (detail: string | null) => detail ?? "—",
    },
    { title: "IP", dataIndex: "ip", key: "ip" },
    {
      title: "User-Agent",
      dataIndex: "userAgent",
      key: "userAgent",
      ellipsis: true,
      render: (value: string | null) => value ?? "—",
    },
  ];
}

export function createPageViewColumns(): ColumnsType<AdminPageView> {
  return [
    {
      title: "时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 168,
      ellipsis: { showTitle: true },
      render: (value: string) => formatTime(value),
    },
    {
      title: "路径",
      dataIndex: "path",
      key: "path",
      width: 96,
      ellipsis: { showTitle: true },
    },
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
      width: 128,
      ellipsis: { showTitle: true },
    },
    {
      title: "访客 ID",
      dataIndex: "visitorId",
      key: "visitorId",
      width: 120,
      ellipsis: { showTitle: true },
    },
    {
      title: "用户",
      key: "user",
      width: 120,
      ellipsis: { showTitle: true },
      render: (_, row) =>
        row.displayName || row.email ? row.displayName || row.email : "未登录",
    },
    {
      title: "User-Agent",
      dataIndex: "userAgent",
      key: "userAgent",
      ellipsis: { showTitle: true },
      render: (value: string | null) => value ?? "—",
    },
  ];
}

/** 操作筛选下拉。value 与后端 action 枚举一致。 */
export const OP_ACTION_OPTIONS = [
  { value: "register", label: "注册" },
  { value: "login", label: "登录" },
  { value: "logout", label: "退出" },
  { value: "generate_er", label: "生成 ER" },
  { value: "export", label: "导出" },
];
