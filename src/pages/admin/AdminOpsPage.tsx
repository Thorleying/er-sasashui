/**
 * 管理端操作记录。支持用户、关键词、动作、日期筛选。
 */
import { Button, Card, Form, Input, InputNumber, Select, Table, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { showError } from "../../app/feedback";
import { ADMIN_PAGE_SIZE, fetchOps, type AdminOp, type OpsQuery } from "../../features/admin/api";
import { AdminOpMobileList } from "../../features/admin/adminMobileList";
import { createOpColumns, OP_ACTION_OPTIONS } from "../../features/admin/columns";
import { useAdminMobile } from "../../features/admin/useAdminMobile";

type OpsFilterValues = {
  userId?: number;
  q?: string;
  action?: string;
  ip?: string;
  from?: string;
  to?: string;
};

/** 操作记录页。 */
export function AdminOpsPage() {
  const isMobile = useAdminMobile();
  const [ops, setOps] = useState<AdminOp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<OpsQuery>({});
  const [form] = Form.useForm<OpsFilterValues>();

  const load = useCallback(async (nextPage: number, nextFilter: OpsQuery) => {
    const result = await fetchOps({ ...nextFilter, page: nextPage, pageSize: ADMIN_PAGE_SIZE });
    if (result.code !== 0) throw new Error(result.message);
    setOps(result.data.items);
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

  async function onFilter(values: OpsFilterValues) {
    const next: OpsQuery = {
      userId: values.userId,
      q: values.q?.trim() || undefined,
      action: values.action,
      ip: values.ip?.trim() || undefined,
      from: values.from || undefined,
      to: values.to || undefined,
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

  const onPageChange = (next: number) => {
    void load(next, filter).catch((err: unknown) => {
      showError(err instanceof Error ? err.message : "加载失败");
    });
  };

  return (
    <div className="admin-page">
      <Typography.Title level={3} className="admin-page-title">
        操作记录
      </Typography.Title>
      <Card className="admin-table-panel">
        <Form
          form={form}
          className="admin-filter-form"
          layout={isMobile ? "vertical" : "inline"}
          onFinish={(values) => void onFilter(values)}
        >
          <Form.Item name="q" label="用户">
            <Input allowClear placeholder="邮箱 / 显示名" className="admin-filter-input admin-filter-input--user" />
          </Form.Item>
          <Form.Item name="userId" label="用户 ID">
            <InputNumber min={1} precision={0} placeholder="精确 ID" className="admin-filter-input" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="action" label="动作">
            <Select
              allowClear
              placeholder="全部"
              className="admin-filter-input"
              options={OP_ACTION_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="ip" label="IP">
            <Input allowClear placeholder="203.0.113" className="admin-filter-input admin-filter-input--ip" />
          </Form.Item>
          <Form.Item name="from" label="从">
            <Input type="date" className="admin-filter-input admin-filter-input--date" />
          </Form.Item>
          <Form.Item name="to" label="到">
            <Input type="date" className="admin-filter-input admin-filter-input--date" />
          </Form.Item>
          <Form.Item className="admin-filter-actions" label={isMobile ? " " : undefined} colon={!isMobile}>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button htmlType="button" onClick={onReset}>
              重置
            </Button>
          </Form.Item>
        </Form>
        {isMobile ? (
          <AdminOpMobileList
            items={ops}
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={total}
            onPageChange={onPageChange}
          />
        ) : (
          <Table
            rowKey="id"
            size="middle"
            className="admin-data-table"
            scroll={{ x: 960 }}
            columns={createOpColumns()}
            dataSource={ops}
            pagination={{
              current: page,
              pageSize: ADMIN_PAGE_SIZE,
              total,
              showSizeChanger: false,
              showTotal: (count) => `共 ${count} 条`,
              onChange: onPageChange,
            }}
            locale={{ emptyText: "暂无数据" }}
          />
        )}
      </Card>
    </div>
  );
}
