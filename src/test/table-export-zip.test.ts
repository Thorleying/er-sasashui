/**
 * 多表 ZIP 导出纯函数单测。
 */
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  composeTableZipEntries,
  filterGraphDataForTable,
  packZipEntries,
  sanitizeTableExportBasename,
} from "../features/export/tableExportZip";

describe("sanitizeTableExportBasename", () => {
  it("替换路径非法字符并保留中文", () => {
    expect(sanitizeTableExportBasename('app/user:1')).toBe("app_user_1");
    expect(sanitizeTableExportBasename("用户")).toBe("用户");
  });
});

describe("filterGraphDataForTable", () => {
  it("只保留目标实体及其属性子图", () => {
    const data = {
      nodes: [
        { id: "entity-users-0", nodeType: "entity" },
        { id: "attr-users-id-0-0", nodeType: "attribute", parentEntity: "entity-users-0" },
        { id: "entity-orders-1", nodeType: "entity" },
        { id: "attr-orders-id-1-0", nodeType: "attribute", parentEntity: "entity-orders-1" },
      ],
      edges: [
        { source: "entity-users-0", target: "attr-users-id-0-0" },
        { source: "entity-orders-1", target: "attr-orders-id-1-0" },
      ],
    };

    const users = filterGraphDataForTable(data, "users", 0);
    expect(users.nodes?.map((n) => n.id)).toEqual(["entity-users-0", "attr-users-id-0-0"]);
    expect(users.edges).toHaveLength(1);

    const orders = filterGraphDataForTable(data, "orders", 1);
    expect(orders.nodes?.map((n) => n.id)).toEqual(["entity-orders-1", "attr-orders-id-1-0"]);
  });
});

describe("composeTableZipEntries", () => {
  it("每张表在 png/svg/drawio 三个目录下各生成一个文件", () => {
    const entries = composeTableZipEntries([
      {
        basename: "users",
        files: {
          svg: "<svg/>",
          png: new Uint8Array([1, 2, 3]),
          drawio: "<mxfile/>",
        },
      },
      {
        basename: "orders",
        files: {
          svg: "<svg2/>",
          png: new Uint8Array([4, 5]),
          drawio: "<mxfile2/>",
        },
      },
    ]);

    expect(Object.keys(entries).sort()).toEqual([
      "drawio/orders.drawio",
      "drawio/users.drawio",
      "png/orders.png",
      "png/users.png",
      "svg/orders.svg",
      "svg/users.svg",
    ]);

    const unzipped = unzipSync(packZipEntries(entries));
    expect(strFromU8(unzipped["svg/users.svg"])).toBe("<svg/>");
    expect(strFromU8(unzipped["drawio/orders.drawio"])).toBe("<mxfile2/>");
    expect(Array.from(unzipped["png/users.png"])).toEqual([1, 2, 3]);
  });

  it("重名表自动加序号后缀", () => {
    const entries = composeTableZipEntries([
      {
        basename: "t",
        files: { svg: "a", png: new Uint8Array([1]), drawio: "x" },
      },
      {
        basename: "t",
        files: { svg: "b", png: new Uint8Array([2]), drawio: "y" },
      },
    ]);
    expect(Object.keys(entries).sort()).toEqual([
      "drawio/t-2.drawio",
      "drawio/t.drawio",
      "png/t-2.png",
      "png/t.png",
      "svg/t-2.svg",
      "svg/t.svg",
    ]);
  });
});
