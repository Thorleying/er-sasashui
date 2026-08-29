/**
 * 管理端只读查询。邮箱对管理员可见，服务层不写日志。
 */
import type { OpFilter, PageViewFilter, Store, UserFilter } from "../../db/types.js";
import { defaultDateRange } from "./admin.schema.js";

export function createAdminService(store: Store) {
  return {
    /**
     * 按日汇总注册 / 登录 / 生成 / 导出。缺日期时用 UTC 近 7 天（含今天）。
     * @param from 起始日 YYYY-MM-DD，可空
     * @param to 结束日 YYYY-MM-DD，可空
     */
    async daily(from?: string, to?: string) {
      const fallback = defaultDateRange();
      const days = await store.dailyStats(from ?? fallback.from, to ?? fallback.to);
      return { days };
    },

    /**
     * 注册用户分页。createdAt / lastLoginAt 转 ISO，供契约直接返回。
     */
    async users(filter: UserFilter) {
      const { items, total } = await store.listUsers(filter);
      return {
        page: filter.page,
        pageSize: filter.pageSize,
        total,
        items: items.map((user) => ({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          disabled: user.disabled,
          registerIp: user.registerIp,
          lastLoginIp: user.lastLoginIp,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        })),
      };
    },

    /**
     * 启用或禁用用户。不能禁用最后一个未禁用的管理员。
     */
    async setUserDisabled(id: number, disabled: boolean) {
      await store.setUserDisabled(id, disabled);
      return { id, disabled };
    },

    /**
     * 操作分页。过滤条件原样交给 Store，这里只做响应整形。
     */
    async ops(filter: OpFilter) {
      const { items, total } = await store.listOps(filter);
      return {
        page: filter.page,
        pageSize: filter.pageSize,
        total,
        items: items.map((op) => ({
          id: op.id,
          userId: op.userId,
          email: op.email,
          displayName: op.displayName,
          action: op.action,
          detail: op.detail,
          ip: op.ip,
          userAgent: op.userAgent,
          createdAt: op.createdAt.toISOString(),
        })),
      };
    },

    /** 页面访问分页（PV 明细，含 IP / UA）。 */
    async pageViews(filter: PageViewFilter) {
      const { items, total } = await store.listPageViews(filter);
      return {
        page: filter.page,
        pageSize: filter.pageSize,
        total,
        items: items.map((view) => ({
          id: view.id,
          visitorId: view.visitorId,
          path: view.path,
          ip: view.ip,
          userAgent: view.userAgent,
          userId: view.userId,
          email: view.email,
          displayName: view.displayName,
          createdAt: view.createdAt.toISOString(),
        })),
      };
    },
  };
}
