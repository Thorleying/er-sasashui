/**
 * 管理端表格列入口。实现见 adminColumns.tsx（含 JSX）；保留 columns.ts 供稳定 import 路径。
 */
export {
  createDailyColumns,
  createOpColumns,
  createPageViewColumns,
  createUserColumns,
  OP_ACTION_OPTIONS,
  type UserColumnsOptions,
} from "./adminColumns";
