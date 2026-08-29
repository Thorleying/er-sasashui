import { describe, expect, it } from "vitest";
import { parseSQLTables } from "../../parser/sql";
import { applyCommentEdits, parseCommentDraft } from "./applyCommentEdits";

describe("applyCommentEdits", () => {
  it("替换 MySQL 列 COMMENT，不改其它语句", () => {
    const sql = `CREATE TABLE users (
  email VARCHAR(255) COMMENT '登录邮箱，唯一，存小写',
  role VARCHAR(16)
);`;
    const next = applyCommentEdits(sql, [{ table: "users", column: "email", comment: "登录邮箱" }]);
    expect(parseSQLTables(next).tables[0].columns[0].comment).toBe("登录邮箱");
    expect(next).toContain("role VARCHAR(16)");
  });

  it("给没有 COMMENT 的列补上注释", () => {
    const sql = `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) NOT NULL
);`;
    const next = applyCommentEdits(sql, [{ table: "users", column: "email", comment: "登录邮箱" }]);
    expect(
      parseSQLTables(next).tables[0].columns.find((col) => col.name === "email")?.comment,
    ).toBe("登录邮箱");
  });

  it("替换表级 COMMENT=", () => {
    const sql = `CREATE TABLE users (
  id BIGINT PRIMARY KEY
) COMMENT='注册用户';`;
    const next = applyCommentEdits(sql, [{ table: "users", comment: "账号表" }]);
    expect(parseSQLTables(next).tables[0].comment).toBe("账号表");
  });
});

describe("parseCommentDraft", () => {
  it("从导入的 SQL 抽出表和列注释供表单用", () => {
    const draft = parseCommentDraft(`CREATE TABLE users (
  email VARCHAR(255) COMMENT '登录邮箱'
) COMMENT='注册用户';`);
    expect(draft).toEqual([
      {
        name: "users",
        comment: "注册用户",
        columns: [{ name: "email", comment: "登录邮箱" }],
      },
    ]);
  });
});
