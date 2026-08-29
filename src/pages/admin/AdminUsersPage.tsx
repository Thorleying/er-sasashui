/**
 * 管理端用户列表。支持关键词 / 角色 / 状态筛选与禁用操作。
 */
import { Button, Card, Form, Input, Select, Table } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showError, showSuccess } from "../../app/feedback";
import {
  ADMIN_PAGE_SIZE,
  fetchUsers,
  setUserDisabled,
  type AdminUser,
  type UsersQuery,
} from "../../features/admin/api";
import { AdminUserMobileList } from "../../features/admin/adminMobileList";
import { createUserColumns } from "../../features/admin/columns";
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from "../../features/admin/filters";
import { useAdminMobile } from "../../features/admin/useAdminMobile";

type UsersFilterValues = {
  q?: string;
  role?: "user" | "admin";
  disabled?: "true" | "false";
};

/** 用户管理页。 */
export function AdminUsersPage() {
  const isMobile = useAdminMobile();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<UsersQuery>({});
  const [form] = Form.useForm<UsersFilterValues>();

  const load = useCallback(async (nextPage: number, nextFilter: UsersQuery) => {
    const result = await fetchUsers({ ...nextFilter, page: nextPage, pageSize: ADMIN_PAGE_SIZE });
    if (result.code !== 0) throw new Error(result.message);
    setUsers(result.data.items);
    setTotal(result.data.total);
    setPage(nextPage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(1, {}).catch((err: unknown) => {
      if (!cancelled) showError(err instanceof Error ? err.message : "加载失败");
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onFilter(values: UsersFilterValues) {
    const next: UsersQuery = {
      q: values.q?.trim() || undefined,
      role: values.role,
      disabled: values.disabled === undefined ? undefined : values.disabled === "true",
    };
    setFilter(next);
    try {
      await load(1, next);
    } catch (err) {
      showError(err instanceof Error ? err.message : "筛选失败");
    }
  }

  function onReset() {
    form.resetFields();
    setFilter({});
    void load(1, {}).catch((err: unknown) => {
      showError(err instanceof Error ? err.message : "加载失败");
    });
  }

  const handleToggleDisabled = useCallback(
    async (user: AdminUser, disabled: boolean) => {
      const result = await setUserDisabled(user.id, disabled);
      if (result.code !== 0) {
        showError(result.message);
        return;
      }
      showSuccess(disabled ? "已禁用该用户" : "已启用该用户");
      try {
        await load(page, filter);
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : "刷新失败");
      }
    },
    [filter, load, page],
  );

  const columns = useMemo(
    () =>
      createUserColumns({
        onToggleDisabled: (user, disabled) => void handleToggleDisabled(user, disabled),
      }),
    [handleToggleDisabled],
  );

  const onPageChange = (next: number) => {
    void load(next, filter).catch((err: unknown) => {
      showError(err instanceof Error ? err.message : "加载失败");
    });
  };

  return (
    <div className="admin-page">
      <Card className="admin-table-panel">
        <Form
          form={form}
          className="admin-filter-form"
          layout={isMobile ? "vertical" : "inline"}
          onFinish={(values) => void onFilter(values)}
        >
          <Form.Item name="q" label="搜索">
            <Input
              allowClear
              placeholder="邮箱 / 显示名 / ID"
              className="admin-filter-input admin-filter-input--user"
            />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select
              allowClear
              placeholder="全部"
              className="admin-filter-input"
              options={USER_ROLE_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="disabled" label="状态">
            <Select
              allowClear
              placeholder="全部"
              className="admin-filter-input"
              options={USER_STATUS_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            className="admin-filter-actions"
            label={isMobile ? " " : undefined}
            colon={!isMobile}
          >
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button htmlType="button" onClick={onReset}>
              重置
            </Button>
          </Form.Item>
        </Form>
        {isMobile ? (
          <AdminUserMobileList
            users={users}
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={total}
            onPageChange={onPageChange}
            onToggleDisabled={(user, disabled) => void handleToggleDisabled(user, disabled)}
          />
        ) : (
          <Table
            rowKey="id"
            size="middle"
            className="admin-data-table"
            scroll={{ x: 1200 }}
            columns={columns}
            dataSource={users}
            pagination={{
              current: page,
              pageSize: ADMIN_PAGE_SIZE,
              total,
              showSizeChanger: false,
              showTotal: (count) => `共 ${count} 人`,
              onChange: onPageChange,
            }}
            locale={{ emptyText: "暂无数据" }}
          />
        )}
      </Card>
    </div>
  );
}
