-- ER洒洒水 · MySQL 结构（与 server/src/db/mysql.ts migrate 同步）
-- 用法：mysql -u root -p < database/schema.sql
-- 注意：不含业务数据；完整数据见 dumps/
-- 字段 COMMENT 给课设/文档用，生成器打开「展示 COMMENT」可画到 ER 图上。

CREATE DATABASE IF NOT EXISTS `er_sasashui`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `er_sasashui`;
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户主键，自增',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT '登录邮箱，唯一，存小写',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希，原文不入库',
  display_name VARCHAR(32) NOT NULL COMMENT '显示名：注册用户为「用户」加四位数字，引导管理员为「管理员」',
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user' COMMENT '角色：user 普通用户，admin 可进管理端',
  disabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否停用：1 禁止登录，最后一个启用中的管理员不能被停',
  register_ip VARCHAR(64) NULL COMMENT '注册时的客户端 IP，经反代时取 X-Forwarded-For',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '注册时间，毫秒精度',
  last_login_at DATETIME(3) NULL COMMENT '最近一次登录成功时间',
  last_login_ip VARCHAR(64) NULL COMMENT '最近一次登录成功时的 IP'
) COMMENT='注册用户。第一个管理员由 ADMIN_BOOTSTRAP_* 环境变量在进程启动时写入';

CREATE TABLE IF NOT EXISTS ops (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '操作记录主键',
  user_id BIGINT NOT NULL COMMENT '操作者，对应 users.id',
  action VARCHAR(32) NOT NULL COMMENT '动作：register / login / logout / generate_er / export',
  detail_json VARCHAR(255) NULL COMMENT '附加说明，已脱敏，可空；生成/导出时可记一句摘要',
  ip VARCHAR(64) NOT NULL COMMENT '操作时的客户端 IP',
  user_agent VARCHAR(512) NULL COMMENT '浏览器 UA，截断后入库',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作发生时间',
  INDEX idx_ops_user (user_id) COMMENT '按用户翻操作记录',
  INDEX idx_ops_action_time (action, created_at) COMMENT '管理端按动作和日期过滤、做每日统计',
  CONSTRAINT fk_ops_user FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='用户操作流水。管理端「全部操作」和每日统计都读这张表';

CREATE TABLE IF NOT EXISTS page_views (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '页面访问主键',
  visitor_id VARCHAR(64) NOT NULL COMMENT '匿名访客标识，前端写入 localStorage，用来算 UV',
  path VARCHAR(512) NOT NULL COMMENT '访问路径，如 /、/app、/admin',
  ip VARCHAR(64) NOT NULL COMMENT '访问 IP',
  user_agent VARCHAR(512) NULL COMMENT '浏览器 UA',
  user_id BIGINT NULL COMMENT '当时已登录则记下用户，未登录为空',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '访问时间',
  INDEX idx_page_views_time (created_at) COMMENT '按时间汇总 PV',
  INDEX idx_page_views_visitor_time (visitor_id, created_at) COMMENT '按访客去重算 UV',
  CONSTRAINT fk_page_views_user FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='前端路由切换时的 PV 埋点。管理端访问记录和趋势图用';

CREATE TABLE IF NOT EXISTS shares (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '分享主键',
  token VARCHAR(32) NOT NULL UNIQUE COMMENT '只读链接口令，出现在 /s/:token',
  user_id BIGINT NOT NULL COMMENT '创建分享的用户',
  title VARCHAR(80) NULL COMMENT '分享标题，可空',
  payload_json MEDIUMTEXT NOT NULL COMMENT '图的快照 JSON，含当时的 SQL/布局，体积可能较大',
  view_count INT NOT NULL DEFAULT 0 COMMENT '被打开次数',
  expires_at DATETIME(3) NULL COMMENT '过期时间，空表示不过期',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  INDEX idx_shares_user (user_id) COMMENT '按作者列出分享',
  CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='只读分享。别人打开链接能看图，不能改原作者的稿';
