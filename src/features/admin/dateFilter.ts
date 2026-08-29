/**
 * 管理端筛选日期：表单里是 Dayjs，请求参数仍是 YYYY-MM-DD。
 */
import type { Dayjs } from "dayjs";

export type FilterDate = Dayjs | null | undefined;

export function formatFilterDate(value: FilterDate): string | undefined {
  return value ? value.format("YYYY-MM-DD") : undefined;
}
