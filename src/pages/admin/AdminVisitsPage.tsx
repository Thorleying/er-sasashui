/**
 * 管理端访问记录（PV 明细）：路径、IP、访客、User-Agent。
 */
import { Button, Card, DatePicker, Form, Input, Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { showError } from "../../app/feedback";
import {
  ADMIN_PAGE_SIZE,
  fetchPageViews,
  type AdminPageView,
  type PageViewsQuery,
} from "../../features/admin/api";
import { AdminVisitMobileList } from "../../features/admin/adminMobileList";
import { createPageViewColumns } from "../../features/admin/columns";
import { formatFilterDate, type FilterDate } from "../../features/admin/dateFilter";
import { useAdminMobile } from "../../features/admin/useAdminMobile";

type PageViewsFilterValues = {
  q?: string;
  path?: string;
  ip?: string;
  from?: FilterDate;
  to?: FilterDate;
};

/** 页面访问记录。 */
export function AdminVisitsPage() {
  const isMobile = useAdminMobile();
  const [items, setItems] = useState<AdminPageView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<PageViewsQuery>({});
  const [form] = Form.useForm<PageViewsFilterValues>();

  const load = useCallback(async (nextPage: number, nextFilter: PageViewsQuery) => {
    const result = await fetchPageViews({
      ...nextFilter,
      page: nextPage,
      pageSize: ADMIN_PAGE_SIZE,
    });
    if (result.code !== 0) throw new Error(result.message);
    setItems(result.data.items);
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

  async function onFilter(values: PageViewsFilterValues) {
    const next: PageViewsQuery = {
      q: values.q?.trim() || undefined,
      path: values.path?.trim() || undefined,
      ip: values.ip?.trim() || undefined,
      from: formatFilterDate(values.from),
      to: formatFilterDate(values.to),
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
      <Card className="admin-table-panel">
        <Form
          form={form}
          className="admin-filter-form"
          layout={isMobile ? "vertical" : "inline"}
          onFinish={(values) => void onFilter(values)}
        >
          <Form.Item name="path" label="路径">
            <Input
              allowClear
              placeholder="/app"
              className="admin-filter-input admin-filter-input--path"
            />
          </Form.Item>
          <Form.Item name="ip" label="IP">
            <Input
              allowClear
              placeholder="203.0.113"
              className="admin-filter-input admin-filter-input--ip"
            />
          </Form.Item>
          <Form.Item name="q" label="用户">
            <Input
              allowClear
              placeholder="邮箱 / 显示名"
              className="admin-filter-input admin-filter-input--user"
            />
          </Form.Item>
          <Form.Item name="from" label="从">
            <DatePicker
              allowClear
              format="YYYY-MM-DD"
              placeholder="开始日期"
              className="admin-filter-input admin-filter-input--date"
            />
          </Form.Item>
          <Form.Item name="to" label="到">
            <DatePicker
              allowClear
              format="YYYY-MM-DD"
              placeholder="结束日期"
              className="admin-filter-input admin-filter-input--date"
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
          <AdminVisitMobileList
            items={items}
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
            columns={createPageViewColumns()}
            dataSource={items}
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
