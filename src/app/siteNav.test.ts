import { describe, expect, it } from "vitest";
import { buildSiteNav } from "./siteNav";

describe("buildSiteNav", () => {
  it("首页也只给生成器和联系作者", () => {
    const items = buildSiteNav("/", false);
    expect(items.map((item) => item.key)).toEqual(["app", "contact"]);
    expect(items.every((item) => item.active === false)).toBe(true);
  });

  it("未登录点生成器会先去登录并带回 /app", () => {
    const app = buildSiteNav("/", false).find((item) => item.key === "app");
    expect(app?.to).toBe("/login");
    expect(app?.state).toEqual({ from: "/app" });
  });

  it("已登录在生成器页标出当前项", () => {
    const items = buildSiteNav("/app", true);
    expect(items[0]).toMatchObject({ key: "app", to: "/app", active: true });
    expect(items[1]).toMatchObject({ key: "contact", to: "/contact", active: false });
  });

  it("联系作者页只高亮联系作者", () => {
    const items = buildSiteNav("/contact", true);
    expect(items.find((item) => item.key === "contact")?.active).toBe(true);
    expect(items.find((item) => item.key === "app")?.active).toBe(false);
  });
});
