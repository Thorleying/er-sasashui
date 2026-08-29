/**
 * 管理端窄屏列表卡片。桌面仍用 Table，移动端用卡片避免宽表溢出。
 */
import { Button, Pagination, Popconfirm, Tag } from "antd";
import type { ReactNode } from "react";
import type { AdminOp, AdminPageView, AdminUser } from "./api";

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

function MobileRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="admin-mobile-card__row">
      <span className="admin-mobile-card__label">{label}</span>
      <span className="admin-mobile-card__value">{value}</span>
    </div>
  );
}

type UserListProps = {
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onToggleDisabled: (user: AdminUser, disabled: boolean) => void;
};

/** 用户管理移动端列表。 */
export function AdminUserMobileList({
  users,
  page,
  pageSize,
  total,
  onPageChange,
  onToggleDisabled,
}: UserListProps) {
  return (
    <div className="admin-mobile-panel">
      {users.length === 0 ? (
        <div className="admin-mobile-empty">暂无数据</div>
      ) : (
        <ul className="admin-mobile-list">
          {users.map((user) => {
            const nextDisabled = !user.disabled;
            return (
              <li key={user.id} className="admin-mobile-card">
                <div className="admin-mobile-card__head">
                  <strong>{user.displayName}</strong>
                  <span className="admin-mobile-card__tags">
                    <Tag color={user.role === "admin" ? "blue" : "default"}>
                      {user.role === "admin" ? "管理员" : "用户"}
                    </Tag>
                    {user.disabled ? (
                      <Tag color="error">已禁用</Tag>
                    ) : (
                      <Tag color="success">正常</Tag>
                    )}
                  </span>
                </div>
                <MobileRow label="邮箱" value={user.email} />
                <MobileRow label="ID" value={user.id} />
                <MobileRow label="注册" value={formatTime(user.createdAt)} />
                <MobileRow
                  label="最近登录"
                  value={user.lastLoginAt ? formatTime(user.lastLoginAt) : "—"}
                />
                <MobileRow label="注册 IP" value={user.registerIp ?? "—"} />
                <MobileRow label="登录 IP" value={user.lastLoginIp ?? "—"} />
                {user.role !== "admin" ? (
                  <div className="admin-mobile-card__actions">
                    <Popconfirm
                      title={nextDisabled ? "确定禁用该用户？" : "确定启用该用户？"}
                      okText={nextDisabled ? "禁用" : "启用"}
                      cancelText="取消"
                      onConfirm={() => onToggleDisabled(user, nextDisabled)}
                    >
                      <Button size="small" danger={nextDisabled}>
                        {user.disabled ? "启用" : "禁用"}
                      </Button>
                    </Popconfirm>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        className="admin-mobile-pagination"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        showTotal={(count) => `共 ${count} 人`}
        onChange={onPageChange}
      />
    </div>
  );
}

type VisitListProps = {
  items: AdminPageView[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/** 访问记录移动端列表。 */
export function AdminVisitMobileList({
  items,
  page,
  pageSize,
  total,
  onPageChange,
}: VisitListProps) {
  return (
    <div className="admin-mobile-panel">
      {items.length === 0 ? (
        <div className="admin-mobile-empty">暂无数据</div>
      ) : (
        <ul className="admin-mobile-list">
          {items.map((row) => (
            <li key={row.id} className="admin-mobile-card">
              <div className="admin-mobile-card__head">
                <strong>{row.path}</strong>
                <span className="admin-mobile-card__time">{formatTime(row.createdAt)}</span>
              </div>
              <MobileRow label="IP" value={row.ip} />
              <MobileRow
                label="用户"
                value={row.displayName || row.email ? row.displayName || row.email : "未登录"}
              />
              <MobileRow label="访客" value={row.visitorId} />
              <MobileRow label="UA" value={row.userAgent ?? "—"} />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        className="admin-mobile-pagination"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        showTotal={(count) => `共 ${count} 条`}
        onChange={onPageChange}
      />
    </div>
  );
}

type OpListProps = {
  items: AdminOp[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/** 操作记录移动端列表。 */
export function AdminOpMobileList({ items, page, pageSize, total, onPageChange }: OpListProps) {
  return (
    <div className="admin-mobile-panel">
      {items.length === 0 ? (
        <div className="admin-mobile-empty">暂无数据</div>
      ) : (
        <ul className="admin-mobile-list">
          {items.map((row) => (
            <li key={row.id} className="admin-mobile-card">
              <div className="admin-mobile-card__head">
                <strong>{ACTION_LABEL[row.action] ?? row.action}</strong>
                <span className="admin-mobile-card__time">{formatTime(row.createdAt)}</span>
              </div>
              <MobileRow label="用户" value={row.displayName || row.email} />
              <MobileRow label="明细" value={row.detail ?? "—"} />
              <MobileRow label="IP" value={row.ip} />
              <MobileRow label="UA" value={row.userAgent ?? "—"} />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        className="admin-mobile-pagination"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        showTotal={(count) => `共 ${count} 条`}
        onChange={onPageChange}
      />
    </div>
  );
}
