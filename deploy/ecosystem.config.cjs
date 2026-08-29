/**
 * pm2 进程配置：统一日志路径、内存上限与生产 NODE_ENV。
 * PORT 优先读安装时的 API_PORT，否则 3002（与 nginx 反代一致）。
 */
const apiPort = process.env.API_PORT || process.env.PORT || "3002";

module.exports = {
  apps: [
    {
      name: "er-sasashui-api",
      cwd: "/opt/er-sasashui/server",
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: apiPort,
      },
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/er-sasashui/api-error.log",
      out_file: "/var/log/er-sasashui/api-out.log",
      max_memory_restart: "512M",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
