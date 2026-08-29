# ER洒洒水 · 前后端分离平台规格

日期：2026-08-29  
产品名：ER洒洒水  
仓库：`/Users/thorleying/Desktop/er`

## 1. 目标

把当前 Vite + React 单页工具改成标准 React 脚手架 SPA，并补 Node 后端。

用户能注册、登录。管理员能看每日情况、注册用户、全部操作记录。

ER 图生成仍在浏览器内完成，不把 SQL 上传到服务器。

## 2. 技术栈（已拍板，不要改）

- 前端：现有 Vite 8 + React 19 + TypeScript，补 React Router。单入口 `index.html`，禁止再加 `app.html` / 多页 HTML。
- 后端：`server/` 下独立 Node + Express + TypeScript + MySQL。
- 包管理：仓库根目录继续 `pnpm`；`server/` 用自己的 `package.json`，安装用 `npm`（与 AGENTS Node 模板一致）。
- 数据库：本地 MySQL，`127.0.0.1:3306`，库名 `er_sasashui`。账号密码只读环境变量，禁止写进源码、规格正文、README、devlog。
- 接口前缀：`/api`。开发时 Vite 代理到 `http://127.0.0.1:3001`。
- 响应契约：`{ "code": 0, "message": "ok", "data": ... }`。失败 `code !== 0`，`message` 中文，`data` 一般为 `null`。
- 错误码：`400xx` 参数；`401xx` 未登录；`403xx` 无权限；`409xx` 冲突；`500xx` 服务器错误。

## 3. 目录与所有权

```txt
er/
├── index.html                 # 唯一 HTML 入口，只挂 #root
├── src/
│   ├── main.tsx               # React 入口 + Router
│   ├── app/                   # 路由、守卫、壳层
│   ├── pages/                 # landing / editor / login / register / admin
│   ├── features/auth/         # 登录态、请求封装
│   ├── features/admin/        # 管理端表格与统计
│   ├── features/landing/      # 欢迎页 React 化
│   ├── App.tsx                # 现有编辑器，不要重写内部
│   └── ...                    # 解析 / 图 / 测试保持不动
├── server/                    # 后端独立工程
└── docs/contracts/api.md      # 前后端契约，双方只读
```

| 角色 | 可写 | 禁止 |
| --- | --- | --- |
| frontend-developer | `index.html`、`src/app/`、`src/pages/`、`src/features/`、`src/main.tsx`、`src/landing/`、`src/i18n.ts`、`app.html`（删除）、`css/landing.css`（仅必要时） | `server/**`、根 `package.json`、`pnpm-lock.yaml`、`vite.config.ts`、`.env*`、`docs/contracts/**` |
| backend-developer | `server/**`（`server/.env` 可写本地，勿提交） | `src/**`、`index.html`、`css/**`、根 `package.json`、`vite.config.ts` |
| integration-lead | 契约、Vite 代理、根脚本、`.gitignore`、`.env.example`、验收 | — |

共享文件默认归 integration-lead。依赖新增只能提议，不能自己改根 `package.json`。

## 4. 前端要求

1. 标准 SPA：`main.tsx` → Router → 页面。`index.html` 不再写欢迎文案或语言按钮。
2. 路由：
   - `/` 欢迎页（原 landing 内容：导航、hero ER、特性、用法、CTA）
   - `/app` 编辑器（复用现有 `App`，壳层补返回首页、登录态、语言切换）
   - `/login` 登录
   - `/register` 注册（只收邮箱和密码；需勾选用户协议与隐私政策）
   - `/terms` 用户协议
   - `/privacy` 隐私政策
   - `/admin` 管理端概览；`/admin/users` 用户；`/admin/ops` 操作（`RequireAdmin` + 后端拦截）
3. 欢迎页必须是 React 组件。可继续调用现有 `src/landing/hero.ts` 的 `initHero` / `rebuildHero` / `resetHeroLayout`。删除 `src/landing/page.ts` 作为入口。
4. 删除 `app.html`。禁止再做 Vite multi-page。
5. 未登录可看欢迎页和 Hero 演示。生成器 `/app` 必须登录；未登录跳到 `/login` 并带 `from=/app`。登录后生成/导出记一条操作（`POST /api/ops`）。
6. 管理端三块：
   - 数据概览：当日指标、ECharts 近七日趋势、每日明细表
   - 注册用户：分页列表
   - 全部操作：分页列表，可按用户 / 动作 / 日期过滤
   - 生成/导出前必须再校验 `/api/auth/me`，未登录不得出图
7. 请求走 `src/features/auth/api.ts`。`credentials: "include"`。不要在组件里直接 `fetch`。
8. 不要重写 `App.tsx` 内部生成逻辑。最多加可选回调（生成成功、导出成功）给上层记操作。
9. 品牌文案保持「ER洒洒水」。不要 GitHub、作者、Skill、第三方字体。
10. 中文项目，注释写中文。新文件补文件级注释，新公共函数补函数级注释。
11. 欢迎页、法律页底部挂页脚。登录 / 注册不挂全站页脚。管理端用独立控制台壳，不挂营销页脚。编辑器不挂页脚。
12. 注册不收集显示名。登录页和顶栏不展示显示名。显示名由后端生成，格式为「用户」加四位数字，仅管理端列表使用。

## 5. 后端要求

1. 启动时读环境变量，缺关键配置直接退出。
2. 启动时若库不存在则创建；跑可重复 migration。
3. 表：
   - `users`：`id` BIGINT PK、`email` 唯一、`password_hash`、`display_name`、`role` (`user`/`admin`)、`created_at`、`last_login_at`
   - `ops`：`id` BIGINT PK、`user_id`、`action`、`detail_json`（可空，已脱敏）、`ip`、`created_at`
4. `action` 枚举：`register` / `login` / `logout` / `generate_er` / `export`。
5. 接口见 `docs/contracts/api.md`。
6. 密码 `bcrypt`，不少于 10 rounds。JWT 放 httpOnly Cookie，名 `er_session`，`SameSite=Lax`，开发 `Secure` 关闭。
7. 启动若没有 admin，用 `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` 建一个。
8. 管理接口必须校验 admin。分页默认 20，最大 100。
9. 日志脱敏：密码、token、邮箱、Cookie 不写原文。
10. 分层：route → controller → service → repository。校验用 zod。
11. 单测覆盖：注册冲突、登录失败、未登录 401、非管理员 403、操作写入。

## 6. 用户流

1. 打开 `/` 看到完整欢迎页，点「打开生成器」进 `/app`。
2. 注册 → 自动登录 → 回跳原页或 `/app`。
3. 登录后顶栏显示邮箱 / 退出，不展示显示名；管理员多一个「管理端」。
4. 管理员打开 `/admin`，能看到统计、用户、操作。非管理员访问 `/admin` 回欢迎页或 403 页。
5. 已登录用户在 `/app` 点生成或导出，管理端操作表能看到对应记录。

## 7. 验收

- `/` 是欢迎页，不是白板标题。
- `/app` 能贴 SQL 生成 ER 图。
- 注册、登录、退出可用。
- 管理员能看每日情况、用户、操作。
- 根目录现有 `pnpm test`（前端 238）不被这次目录调整弄坏。
- 后端 `npm test` 关键鉴权路径通过。
- 不提交 `.env`，不把数据库密码写进仓库。

## 8. 假设

- MySQL 用户默认 `root`，密码只在本地 `.env`。
- 第一个管理员靠 bootstrap 环境变量，不公开注册成 admin。
- 不做邮箱验证、不做 OAuth、不部署上线。
- 不做 SQL 云端解析。
- 前端依赖 `react-router-dom` 由 integration-lead 安装。
