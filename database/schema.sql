-- ER洒洒水 · MySQL 结构（与 server/src/db/mysql.ts migrate 同步）
-- 用法：mysql -u root -p < database/schema.sql
-- 注意：不含业务数据；完整数据见 dumps/

CREATE DATABASE IF NOT EXISTS `er_sasashui`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `er_sasashui`;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(32) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  disabled TINYINT(1) NOT NULL DEFAULT 0,
  register_ip VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NULL,
  last_login_ip VARCHAR(64) NULL
);

CREATE TABLE IF NOT EXISTS ops (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  action VARCHAR(32) NOT NULL,
  detail_json VARCHAR(255) NULL,
  ip VARCHAR(64) NOT NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_ops_user (user_id),
  INDEX idx_ops_action_time (action, created_at),
  CONSTRAINT fk_ops_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS page_views (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visitor_id VARCHAR(64) NOT NULL,
  path VARCHAR(512) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  user_agent VARCHAR(512) NULL,
  user_id BIGINT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_page_views_time (created_at),
  INDEX idx_page_views_visitor_time (visitor_id, created_at),
  CONSTRAINT fk_page_views_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shares (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  title VARCHAR(80) NULL,
  payload_json MEDIUMTEXT NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_shares_user (user_id),
  CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users(id)
);
