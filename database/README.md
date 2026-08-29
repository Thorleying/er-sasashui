# 数据库

## 文件

| 路径 | 说明 |
|------|------|
| `schema.sql` | 空库结构（users / ops / page_views / shares） |
| `dumps/er_sasashui-*.sql.gz` | 逻辑备份（含业务数据） |

## 恢复结构（空库）

```bash
mysql -u root -p < database/schema.sql
```

## 恢复完整备份

```bash
gunzip -c database/dumps/er_sasashui-20260829.sql.gz | mysql -u root -p
```

## 本地导出

本机 MySQL 未运行时，可从生产拉取（需 SSH）：

```bash
bash deploy/mysql-backup.sh   # 在服务器上
# 或见 deploy/README.md
```

**注意**：`dumps/` 含用户邮箱、密码哈希、分享快照中的 SQL 原文，勿公开泄露；提交前确认仓库可见性。
