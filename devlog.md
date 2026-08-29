# Devlog

## 2026-08-29

### 00:24 · 删除 Skill 与落地预览

- 任务：按用户要求删除 Agent Skill，并去掉落地预览；工具页升为站点首页。
- 类型：计划
- 计划：
  1. 删除 `skills/`，以及 App 安装胶囊、CLI 测试、`skill:build`、CI 校验。
  2. 用原 `sql2er.html` 覆盖 `index.html`，删除独立工具页和 landing / embedded 仅服务 Skill 的代码。
  3. 同步 Vite 入口、文案、样式、测试。
  4. 跑 typecheck / 单测，浏览器确认 `/` 直接进入编辑器。
- 预期范围：Skill 与落地预览相关文件；不改解析、布局、导出主路径。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：落地页 FAQ / Skill 文档会一并消失；对外 Pages 路径从 `/sql2er.html` 变为 `/`。

### 00:28 · 去署名、去字体、重构首页品牌

- 任务：删除作者信息与 GitHub 入口，去掉第三方字体，首页改名为「ER洒洒水」并重写 slogan。
- 类型：计划
- 计划：
  1. 去掉首页 GitHub 折角及相关样式；README 去掉原作者 / 原仓库外链。
  2. 删除 `assets/fonts/`，页面 token 与画布节点改系统字体。
  3. 重构首页标题区：站名、slogan、操作提示。
  4. 跑 typecheck / 单测，浏览器看首页与生成路径。
- 预期范围：品牌与字体；不改解析、布局、导出主路径。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：LICENSE 仍是 AGPL，原文案版权声明不能从许可证里抹掉。

### 00:32 · 去署名、去字体、重构首页品牌

- 任务：删除作者信息与 GitHub 入口，去掉第三方字体，首页改名为「ER洒洒水」并重写 slogan。
- 类型：改动 / 验证
- 改动：
  - 去掉首页 GitHub 折角；README 去掉原作者与原仓库外链。
  - 删除 `assets/fonts/`，页面与画布改系统字体。
  - 首页品牌改为「ER洒洒水」，slogan 改为「贴上建表语句，实体关系图马上出来。」
- 文件：`index.html` / `src/i18n.ts` / `src/main.tsx` / `assets/base.css` / `css/style.css` / `src/graph/updateGraphStyles.ts` / `README.md` / `README.en.md` / `package.json` / `assets/fonts/`（删除）
- 验证：`pnpm typecheck` PASS；`pnpm format:check` PASS；`pnpm test` 27 files / 238 tests PASS；浏览器 `/` 标题为 ER洒洒水，无 GitHub 折角，点生成后预览出图。
- 风险：LICENSE 仍是 AGPL，不能从许可证里抹掉原协议；`.github` 工作流还在，只是页面上不再露出 GitHub。

### 00:34 · 恢复欢迎页并拆开工具页

- 任务：用户看到的 `/` 只剩标题、没有欢迎界面和编辑器。把欢迎页和工具页拆开。
- 类型：计划
- 计划：
  1. `/` 做成 ER洒洒水欢迎页（导航、hero、特性、用法），不带 GitHub / Skill。
  2. 编辑器放到 `/app.html`，欢迎页按钮跳过去。
  3. 恢复 `landing.css` / `hero.ts`，欢迎页样式走 head 里的 CSS，不再只靠 React 入口。
  4. 浏览器分别看 `/` 和 `/app.html`。
- 预期范围：入口 HTML、落地页脚本、Vite 多页配置。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：旧标签页若还停在崩溃的 HMR 状态，需要硬刷新。

### 00:40 · 前后端分离平台重构

- 任务：用户要求标准 React 脚手架 + Node 后端注册登录 + 管理端（每日情况 / 用户 / 全部操作），多代理并行。
- 类型：计划
- 计划：
  1. 写规格与 API 契约，停掉 `app.html` 双入口。
  2. integration-lead 先改 Vite 代理、gitignore、server 骨架、安装 `react-router-dom`。
  3. 并行启动 frontend-developer 与 backend-developer，文件所有权不重叠。
  4. 汇合后联调、补测、浏览器验收。
- 预期范围：前端路由与账号页、`server/` 新工程、管理端只读查询。不改 ER 解析/出图内核。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：MySQL 本地库若连不上，后端验收会卡住；数据库密码只进本地环境变量，不入库。

### 00:42 · 前后端分离平台重构

- 任务：规格落地并启动并行代理。
- 类型：改动
- 改动：写入规格与 API 契约；Vite 去掉 `app.html` 多页入口并加 `/api` 代理；安装 `react-router-dom`；建 `server/` 骨架与本地环境文件；并行启动 frontend / backend 代理。
- 结论：双 HTML 方案已停。本机 `127.0.0.1:3306` 当前拒绝连接，官方 MySQL 需提权才能启动，后端联调先被堵住。
- 文件：`docs/specs/er-platform.md` / `docs/contracts/api.md` / `vite.config.ts` / `.gitignore` / `package.json` / `server/package.json` / `server/tsconfig.json` / `server/.env.example`
- 验证：`pnpm add react-router-dom` PASS；`server` 依赖 `npm install` PASS；Node 连 3306 得到 `ECONNREFUSED`。
- 风险：MySQL 没起来时管理端接口无法对真实库验收。

### 00:49 · 首页 Hero 空盒

- 任务：用户截图右侧预览全黑，要求把欢迎页写完整。
- 类型：计划
- 计划：
  1. 修 `src/landing/page.ts` 错误 CSS 导入（脚本没起来，hero 就不会画）。
  2. 浏览器确认 `/` 右侧出现可拖的 ER 图，下方特性 / 用法 / CTA 在。
  3. 本机前端代理并行打磨欢迎页观感，不改解析内核。
- 预期范围：落地页脚本与样式；不改 ER 解析。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：旧标签若还缓存着 Vite 报错，需要硬刷新。

### 00:51 · 首页 Hero 空盒

- 任务：修好欢迎页右侧空盒。
- 类型：改动 / 验证
- 改动：去掉 `src/landing/page.ts` 里错误的 `../assets/base.css` 导入（会解析到不存在的 `src/assets/`，整页 JS 起不来）。Hero 改为首屏立刻加载。
- 结论：`/` 右侧 `#hero-er` 已画出可拖 ER 图；`/app.html` 编辑器还在。欢迎页打磨和后端接口由本机代理继续。
- 文件：`src/landing/page.ts`
- 验证：浏览器 `/` 量到 canvas 622×497；`/app.html` 能进编辑器。未跑全量单测（只改落地页入口）。
- 风险：用户标签若还停在旧报错，需要硬刷新。

### 00:53 · 后端认证与管理接口

- 任务：汇合 backend-developer 的管理端接口。
- 类型：审查 / 验证
- 改动：确认 `createApp` 挂了 `/api/auth` `/api/ops` `/api/admin`；启动时建库并 bootstrap admin；单测走内存 Store。
- 结论：接口契约已落地。本机 3306 仍拒绝连接，真实库联调还没做。
- 文件：`server/src/app.ts` / `server/src/server.ts` / `server/src/modules/admin/*` / `server/src/app.test.ts`
- 验证：`cd server && npm run typecheck` PASS；`npm test` 1 file / 5 tests PASS。
- 风险：`pnpm dev:api` 现在会因 MySQL 没起来而退出。

### 00:57 · 清掉 Hero 里残留的 Poppins

- 任务：用户要求不用第三方字体。页面 CSS 已是系统栈，首页画布还在写 Poppins。
- 类型：计划
- 计划：把 `src/landing/hero.ts` 的 Poppins 换成与编辑器画布相同的系统字体栈。
- 预期范围：仅 hero 画布字族。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：无 webfont 文件可回退，改完应立刻落到 PingFang / 雅黑。

### 00:58 · 清掉 Hero 里残留的 Poppins

- 任务：用户要求不用第三方字体。
- 类型：改动 / 验证
- 改动：`src/landing/hero.ts` 六处 Poppins 改为系统字体栈，与编辑器画布一致。
- 结论：仓库无 webfont 文件、无 Google Fonts。页面是 PingFang / 宋体，画布不再点名 Poppins。
- 文件：`src/landing/hero.ts`
- 验证：`pnpm format:check` PASS；浏览器 body 为 PingFang SC，标题为 Songti SC，样式表只有本地 `base.css` / `landing.css`，`#hero-er` canvas 仍在。
- 风险：无。

### 01:00 · 欢迎页观感打磨汇合

- 任务：汇合 frontend-developer 对欢迎页的补全。
- 类型：审查
- 改动：`index.html` 补跳过链接与加载/失败文案；`landing.css` 给 Hero 写死高度；`hero.ts` 避免 0×0 画布。Poppins 未加回。
- 结论：欢迎页作为落地页可用。React Router 脚手架、登录注册、管理端 UI 还没做。
- 文件：`index.html` / `css/landing.css` / `src/landing/hero.ts` / `src/landing/page.ts`
- 验证：本轮未再开浏览器；上一轮已确认 canvas 与系统字体。未跑前端全量单测。
- 风险：编辑器仍在 `/app.html`，和规格里的 `/app` 还没对齐。

### 01:01 · 标题不要宋体展示栈

- 任务：用户说字体不对。大标题走宋体 + italic，看起来像第三方展示字体。
- 类型：计划
- 计划：`--font-display` 改成和标题同一套苹方/雅黑；品牌名和大标题取消 italic。
- 预期范围：token 与欢迎页标题样式。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：区块数字、小节标题也会一起从宋体变成无衬线。

### 01:02 · 标题不要宋体展示栈

- 任务：用户说字体不对。大标题宋体 + italic 看起来像第三方字体。
- 类型：改动 / 验证
- 改动：`--font-display` / `--font-display-cn` 改成苹方/雅黑；品牌名和大标题取消 italic。
- 结论：标题、品牌、正文同一套系统无衬线。
- 文件：`assets/base.css` / `css/landing.css`
- 验证：浏览器计算样式 title/brand 均为 PingFang SC、font-style normal。
- 风险：无。

### 01:03 · 对接登录并重构前端壳层

- 任务：用户要知道 DBML、对接已有后端登录，并按 ui-ux-pro-max 重构前端。
- 类型：计划
- 计划：
  1. 设计系统沿用暖纸 + 橙强调 + 系统字体，不引入 Space Mono / 绿强调。
  2. React Router 单入口：`/` `/app` `/login` `/register` `/admin`。
  3. 登录注册走 `/api/auth`，管理端走 `/api/admin`。
  4. 表单可见 label、就近报错、提交 loading。
- 预期范围：前端壳层与账号页；编辑器只加可选回调。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：3306 若仍拒绝连接，进程入口会降级到内存库以便本地能登录。

### 01:08 · 对接登录并重构前端壳层

- 任务：把欢迎页 / 编辑器 / 登录注册 / 管理端收进 React Router，并接到已有 `/api/auth`。
- 类型：改动
- 改动：
  - 单入口 `index.html` + `AppRouter`；`/app.html` 跳到 `/app`。
  - 登录注册管理端对接后端契约；已登录生成/导出会写 `/api/ops`。
  - 欢迎页正文解释 DBML；3306 拒绝连接时 API 降级内存库。
- 文件：`src/app/*` / `src/pages/*` / `src/features/auth/*` / `src/features/admin/api.ts` / `src/main.tsx` / `index.html` / `app.html` / `server/src/server.ts` / `server/src/config/env.ts`
- 验证：进行中
- 风险：内存库重启后账号会丢。

### 01:15 · 对接登录并重构前端壳层

- 任务：登录接到已有后端，前端收成 React SPA。
- 类型：验证
- 结论：
  - `pnpm typecheck` PASS；前端 28 files / 243 tests PASS；后端 5 tests PASS。
  - 浏览器：`/` 解释 DBML 且 Hero 有 canvas；`/login` 管理员登录成功；`/register` 可注册并进入 `/app`；`/admin` 能看每日情况、用户、操作（含登录与生成 ER）。
  - 根目录 `app.html` 会把 `/app` 劫持成空跳转页，已删除。
  - 本机 3306 仍拒绝连接，API 已落到内存库并 bootstrap 管理员。
- 文件：`index.html` / `src/main.tsx` / `src/app/*` / `src/pages/*` / `src/features/auth/*` / `src/features/admin/api.ts` / `src/App.tsx` / `src/hooks/useGraph.ts` / `server/src/server.ts` / `server/src/config/env.ts` / `README.md` / `app.html`（删除）
- 验证：浏览器走通登录、注册、管理端、生成上报；未跑 `pnpm build`（改的是开发壳层）。
- 风险：内存库重启后账号和操作记录会丢；MySQL 起来后应关掉进程再以默认 `ER_STORE=mysql` 启动。

### 01:17 · 用户端对接 antd 并重构布局

- 任务：接入 Ant Design，去掉 emoji，用户端布局全部换成 antd 组件。
- 类型：计划
- 计划：
  1. 用 pnpm 安装 `antd` 与 `@ant-design/icons`，在入口挂 ConfigProvider（暖纸 + 陶土橙 + 系统字体）。
  2. 用户端壳层改成 antd Layout：顶栏、欢迎页、登录注册、生成器工作台。
  3. `App.tsx` 已超 800 行，先把界面拆到 `features/editor`，只换控件不改解析出图。
  4. 管理端表格/统计一并换成 antd。
  5. 全量搜剩余 emoji；跑 typecheck / 相关测试；浏览器走 `/` `/app` `/login` `/admin`。
- 预期范围：前端壳层与控件；不改 SQL/DBML 解析、G6 出图内核、后端接口。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：导出按钮现有复杂动效会收成 antd Dropdown；历史面板收成 Drawer。

### 01:31 · 用户端对接 antd 并重构布局

- 任务：接入 Ant Design，去掉 emoji，用户端布局全部换成 antd 组件。
- 类型：改动 / 验证
- 改动：
  - 入口挂 `AntdProvider`（陶土橙 `#d97757`、系统黑体、中英 locale、暗色算法）。
  - 用户端统一 `UserLayout` + `SiteHeader`：欢迎 / 生成器 / 登录注册 / 管理端同一顶栏。
  - 生成器拆到 `EditorWorkspace`：Card / Switch / Dropdown / Slider / Alert / Spin；历史改为 Drawer + List。
  - 登录注册走 Form + Input.Password；管理端走 Table + Result 403。
  - 去掉旧自定义壳：`HistoryOverlay` / `SiteNav` / `SwitchControl` / `shell.css`。页面文案无 emoji。
- 文件：`src/theme/AntdProvider.tsx` / `src/app/UserLayout.tsx` / `src/app/SiteHeader.tsx` / `src/app/user-layout.css` / `src/features/editor/*` / `src/features/admin/columns.ts` / `src/pages/*` / `src/main.tsx` / `src/App.tsx` / `src/HistoryOverlay.tsx`（删除） / `src/app/SiteNav.tsx`（删除） / `src/components/SwitchControl.tsx`（删除） / `src/app/shell.css`（删除）
- 验证：`pnpm typecheck` PASS；`pnpm format:check` PASS；`pnpm test` 28 files / 243 tests PASS。浏览器：`/` Hero 有 canvas、无 emoji；`/app` 生成出图、导出菜单 PNG/Drawio/SVG、历史 Drawer；`/login` 管理员登录成功；普通账号进 `/admin` 见 403；管理员见三张表。窄屏顶栏不再被 64px 裁切。
- 风险：本机 3306 仍拒绝连接，API 继续走内存库；未跑 `pnpm build`（改的是开发壳层）。

### 01:52 · 用户端移动适配

- 任务：窄屏顶栏挤成两行、欢迎页画布被裁、登录页按钮排满一行。
- 类型：计划
- 计划：
  1. 顶栏 ≤880px 只留品牌 + 菜单按钮，其余进 antd Drawer。
  2. 欢迎页 Hero 单列、标题缩小、CTA 拉满、舞台固定高度，去掉 `#hero-er` 的 min-width 以免撑出屏幕。
  3. 登录注册 / 管理端补边距，表格加横向滚动。
  4. 浏览器 390 宽走 `/` `/login` `/app`。
- 预期范围：用户端壳层与欢迎页样式；不改解析出图内核。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：Hero 画布变窄后节点更密，仍可能贴边。

### 01:58 · 用户端移动适配

- 任务：窄屏顶栏、欢迎页画布、登录页挤裁。
- 类型：改动 / 验证
- 改动：
  - 顶栏 ≤880px 只留品牌 + 菜单，其余进 Drawer。
  - 欢迎页 Hero 单列、标题缩小、CTA 拉满、舞台 260px；`#hero-er` 去掉 min-width。
  - 登录 / 管理端补边距；管理端表格加横向滚动；生成器窄屏单列。
- 文件：`src/app/SiteHeader.tsx` / `src/app/user-layout.css` / `css/landing.css` / `src/pages/LandingPage.tsx` / `src/pages/AdminPage.tsx` / `src/features/editor/editor.css`
- 验证：`pnpm typecheck` PASS；`pnpm format:check` PASS；`pnpm test` 28 files / 243 tests PASS。浏览器 390×844：`/` 顶栏 65px 单行、无横向溢出、CTA 拉满、Hero 舞台 356×258；`/login` 汉堡菜单 + 表单；`/app` 卡片单列。1280 宽仍是横排导航。
- 风险：窄屏 Hero 节点更密，舞台边缘仍可能贴字。

### 01:59 · 生成必须登录并重构首页

- 任务：未登录不能生成；按 ui-ux-pro-max 重构欢迎页，去掉「出图不用登录」文案。
- 类型：计划
- 计划：
  1. 跑 ui-ux-pro-max `--design-system` + landing/ux 检索；颜色字体仍用暖纸陶土和系统黑体。
  2. `/app` 加登录守卫，未登录带 `from=/app` 去登录页。
  3. 首页 CTA / 特性 / 步骤改成「先登录再生成」，卡片补图标和层次。
  4. 同步规格与登录页文案；浏览器分别走未登录 / 已登录。
- 预期范围：路由守卫、欢迎页、文案；不改解析出图内核。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：规格原文允许游客出图，本轮按用户要求改掉。

### 02:03 · 生成必须登录并重构首页

- 任务：未登录不能生成；按 ui-ux-pro-max 的 Hero + 三特性 + 三步漏斗重构欢迎页。
- 类型：改动 / 验证
- 改动：
  - `/app` 加 `RequireAuth`，未登录带 `from` 去 `/login`。
  - 首页 CTA / 步骤 / 底栏改成先登录再出图；特性卡补图标和层次。
  - skill 建议的 OLED、荧光绿、Space Mono 未采用，颜色字体仍是暖纸陶土 + 系统黑体。
  - 规格 §4.5、登录注册文案同步。
- 文件：`src/app/RequireAuth.tsx` / `src/app/router.tsx` / `src/app/SiteHeader.tsx` / `src/pages/LandingPage.tsx` / `src/app/user-layout.css` / `src/pages/LoginPage.tsx` / `src/pages/RegisterPage.tsx` / `docs/specs/er-platform.md`
- 验证：`pnpm typecheck` PASS；`pnpm test` 243 PASS。浏览器：未登录访问 `/app` 落到登录页；登录后回到 `/app` 能进生成器；首页无「不用登录」。
- 风险：首页 Hero 演示仍可拖，那不是生成器出图。

### 02:05 · 去掉英文切换

- 任务：删除语言切换，界面默认并固定中文。
- 类型：计划
- 计划：
  1. 顶栏和菜单去掉 EN 按钮。
  2. `detectLang` / antd locale / 编辑器文案固定 `zh`。
  3. 去掉 `sql2er-lang` 切换监听。
  4. 跑 typecheck / 测试，浏览器看顶栏没有 EN。
- 预期范围：壳层与语言检测；不删 i18n 英文字典（示例识别还用得到）。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：本地若存过 `sql2er-lang=en`，将不再生效。

### 02:07 · 去掉英文切换

- 任务：删除语言切换，界面固定中文。
- 类型：改动 / 验证
- 改动：顶栏去掉 EN；`detectLang` 恒为 `zh`；antd 固定 `zhCN`；编辑器不再听 `sql2er-lang`。
- 文件：`src/app/SiteHeader.tsx` / `src/language.ts` / `src/app/chrome.ts` / `src/theme/AntdProvider.tsx` / `src/App.tsx` / `src/pages/LandingPage.tsx` / `src/landing/hero.ts`
- 验证：`pnpm typecheck` PASS；`pnpm test` 243 PASS。浏览器首页菜单只有主题切换，没有 EN。
- 风险：无。

### 02:08 · 默认关着色并独立登录布局

- 任务：着色默认关闭；登录页不再套全站顶栏；回复里告知本机管理员账号。
- 类型：计划
- 计划：
  1. `useGraph` 里 `isColored` 初始改为 `false`。
  2. 新增 `AuthLayout`，登录 / 注册共用，左右分栏，不挂 `SiteHeader`。
  3. 浏览器看登录页无全站导航；生成器着色按钮默认未按下。
- 预期范围：编辑器默认样式、账号页壳；不改解析内核。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：历史快照若存过着色，恢复快照仍会开着色。

### 02:10 · 默认关着色并独立登录布局

- 任务：着色默认关闭；登录 / 注册独立壳。
- 类型：改动 / 验证
- 改动：`useGraph` 的 `isColored` 初始为 `false`；新增 `AuthLayout`，登录注册不再套 `UserLayout`。
- 文件：`src/hooks/useGraph.ts` / `src/app/AuthLayout.tsx` / `src/app/auth-layout.css` / `src/pages/LoginPage.tsx` / `src/pages/RegisterPage.tsx`
- 验证：`pnpm typecheck` PASS；`pnpm test` 243 PASS。浏览器：`/login` `/register` 无全站顶栏；`/app` 着色按钮未按下。
- 风险：恢复带着色的历史快照仍会开着色。管理员口令只在本机环境文件，未写入仓库文档。

### 02:11 · 协议页脚与随机显示名

- 任务：补用户协议、隐私政策、全站页脚；注册不再填显示名，后端生成「用户xxxx」。
- 类型：计划
- 计划：
  1. 按实际数据流起草 `/terms` `/privacy`（运营方信息标待补充）。
  2. `SiteFooter` 挂到用户壳和登录壳；注册勾选同意。
  3. 注册契约去掉 displayName，服务端 `用户` + 四位随机数。
  4. 更新契约与后端测试。
- 预期范围：法务页、页脚、注册入参；不改出图内核。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：文案不是律师意见；目前没有自助注销和对外联系邮箱。

### 02:16 · 协议页脚与随机显示名

- 任务：补用户协议、隐私政策、页脚；注册不填显示名，后端生成「用户xxxx」。
- 类型：改动 / 验证
- 改动：新增 `/terms` `/privacy` 与 `SiteFooter`；欢迎页 / 账号页 / 法律页 / 管理端挂页脚，编辑器不挂；注册契约去掉 `displayName`，服务端 `用户` + 四位随机数；登录页与顶栏不展示显示名，顶栏改显示邮箱。
- 文件：`src/app/SiteFooter.tsx` / `src/pages/TermsPage.tsx` / `src/pages/PrivacyPage.tsx` / `src/app/UserLayout.tsx` / `src/app/AuthLayout.tsx` / `src/pages/RegisterPage.tsx` / `src/pages/LandingPage.tsx` / `src/app/SiteHeader.tsx` / `src/app/router.tsx` / `server/src/modules/auth/auth.schema.ts` / `server/src/modules/auth/auth.service.ts` / `docs/contracts/api.md` / `docs/specs/er-platform.md`
- 验证：`pnpm typecheck` PASS；`pnpm test` 244 PASS；`server` `npm test` 6 PASS / `npm run typecheck` PASS。浏览器：`/register` 无显示名字段、有协议勾选与页脚；`/login` 只有邮箱密码和页脚；`/terms` `/privacy` 正文在；`/` 底部有法律入口。接口注册传入自定义名仍返回 `用户8549`。登录后抽屉可见邮箱，不可见 `用户8549`。
- 风险：协议与隐私政策不是律师意见；运营主体、对外联系邮箱、自助注销待补充。编辑器为保画布高度不挂页脚。内存库重启后账号清空。

### 02:17 · 账号页去掉全站页脚

- 任务：登录界面不再用全站页脚条，协议入口改到表单里。
- 类型：计划
- 计划：
  1. `AuthLayout` 卸掉 `SiteFooter`，恢复两列铺满视口。
  2. 登录卡片内写「登录即表示同意用户协议和隐私政策」；注册继续用勾选。
  3. 欢迎页 / 法律页 / 管理端仍挂页脚。
  4. 浏览器看 `/login` `/register` `/`。
- 预期范围：账号页展示；不改鉴权与出图。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：登录页不再有底部品牌条，法律入口只在卡片内。

### 02:20 · 账号页去掉全站页脚

- 任务：登录界面不再用全站页脚条，协议入口改到表单里。
- 类型：改动 / 验证
- 改动：`AuthLayout` 卸掉 `SiteFooter`；登录卡片内「登录即表示同意」链到协议页；注册仍用勾选。欢迎页 / 法律页 / 管理端页脚保留。
- 文件：`src/app/AuthLayout.tsx` / `src/app/auth-layout.css` / `src/pages/LoginPage.tsx` / `src/app/SiteFooter.tsx` / `docs/specs/er-platform.md`
- 验证：`pnpm typecheck` PASS；`pnpm test` 244 PASS。浏览器：`/login` `/register` 无底部页脚条，协议入口在卡片内且可点；`/` `/terms` 仍有页脚。
- 风险：登录页不再有底部品牌条。

### 02:21 · 书名号、首页导语与免费标

- 任务：协议名加《》；改首页过长导语；加一条醒目的「免费使用」。
- 类型：计划
- 计划：
  1. 登录 / 注册同意文案改为《用户协议》《隐私政策》。
  2. 缩短 hero 导语，去掉括号里的英文解释。
  3. Hero 加 terracotta 亮标「免费使用」。
  4. 浏览器看 `/` `/login` `/register`。
- 预期范围：文案与 hero 样式；不改鉴权与出图。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：DBML 全称只留在下方特性卡。

### 02:22 · 书名号、首页导语与免费标

- 任务：协议名加《》；改首页过长导语；加「免费使用」亮标。
- 类型：改动 / 验证
- 改动：登录 / 注册同意文案改为《用户协议》《隐私政策》；hero 导语收短；kicker 旁加 terracotta「免费使用」标。
- 文件：`src/pages/RegisterPage.tsx` / `src/pages/LoginPage.tsx` / `src/pages/TermsPage.tsx` / `src/pages/PrivacyPage.tsx` / `src/pages/LandingPage.tsx` / `css/landing.css`
- 验证：`pnpm typecheck` PASS；`pnpm test` 244 PASS。浏览器：`/` 见新导语与「免费使用」标；`/register` 勾选为《用户协议》《隐私政策》。
- 风险：DBML 全称只留在下方特性卡。窄屏「右侧是演示」仍不准确，本轮未改。

### 02:24 · 管理端权限与运营台

- 任务：核对并补齐管理端运营界面、前端路由守卫、后端接口鉴权。
- 类型：计划
- 计划：
  1. 新增 `RequireAdmin`：未登录去登录，已登录非管理员 403。
  2. `/admin` 走守卫；运营台补分页和操作筛选。
  3. 后端补未登录 401、三组接口 403、管理员可读、不信 JWT role。
  4. 浏览器验未登录 / 普通用户 / 管理员三条路径。
- 预期范围：管理端壳与鉴权测试；不改出图内核。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：内存库重启后管理员要重新 bootstrap。

### 02:28 · 去掉说明文案并重做管理端

- 任务：去掉登录/权限页的解释性字样；管理端对标真实 B 端后台。
- 类型：计划
- 计划：
  1. 登录 / 注册卡片和侧栏去掉「解析在浏览器」类说明；403 去掉权限讲解。
  2. 新增 `AdminLayout` 侧栏 + 顶栏，拆成概览 / 用户 / 操作三个路由。
  3. 概览用统计卡片 + 每日表；用户、操作独立成页。
  4. 浏览器看 `/login` `/admin` `/admin/users` `/admin/ops`。
- 预期范围：账号文案与管理端壳；不改出图内核与鉴权规则。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：管理端不再套用户站顶栏，入口仍从站点「管理端」进去。

### 02:34 · 去掉说明文案并重做管理端

- 任务：去掉登录/权限页的解释性字样；管理端对标真实 B 端后台。
- 类型：改动 / 验证
- 改动：登录侧栏改为「欢迎回来」；卡片写「欢迎回来，用邮箱继续。」不再写解析/必须登录说明。403 只留「没有权限」。管理端深色侧栏控制台，拆成 `/admin` `/admin/users` `/admin/ops`；窄屏侧栏进抽屉。首页 CTA 去掉「解析仍在浏览器 / 记到管理端」类讲解。
- 文件：`src/pages/LoginPage.tsx` / `src/pages/RegisterPage.tsx` / `src/pages/LandingPage.tsx` / `src/app/AdminLayout.tsx` / `src/app/admin-layout.css` / `src/pages/admin/*` / `src/app/RequireAdmin.tsx`
- 验证：`pnpm typecheck` PASS；`pnpm test` 247 PASS。浏览器：`/login` 见欢迎语、无技术说明；`/admin` 有侧栏、四张当日卡、每日表；`/admin/users` 共 2 人；`/admin/ops` 有筛选且共 6 条。
- 风险：管理端不再套用户站顶栏。内存库重启后管理员要重新登录。

### 02:35 · ECharts 与生成登录拦截

- 任务：管理端概览加 ECharts；生成/导出前再向后端确认登录，防止绕过。
- 类型：计划
- 计划：
  1. 安装 `echarts`，概览页加近 7 日趋势图。
  2. `requireSession` 打 `/api/auth/me`，失败清登录态。
  3. 生成器和导出按钮先过 `requireSession`，未通过回登录页。
  4. 浏览器看 `/admin` 图表；未登录点生成应进不了 `/app`。
- 预期范围：管理端图表、生成门闩；不改解析内核。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：首页 Hero 演示仍可拖，不等于生成器。

### 02:38 · ECharts 与生成登录拦截

- 任务：管理端概览加 ECharts；生成/导出前再向后端确认登录。
- 类型：改动 / 验证
- 改动：依赖 `echarts@6.1.0`；概览加近七日折线。`requireSession` 打 `/api/auth/me`；生成和导出先过门闩，失败回 `/login`。路由守卫仍拦 `/app`。
- 文件：`package.json` / `src/features/admin/dailyTrend.ts` / `src/features/admin/AdminTrendChart.tsx` / `src/pages/admin/AdminOverviewPage.tsx` / `src/features/auth/AuthContext.tsx` / `src/pages/EditorPage.tsx` / `src/App.tsx` / `src/test/admin-daily-trend.test.ts`
- 验证：`pnpm typecheck` PASS；`pnpm test` 248 PASS。浏览器：`/admin` 趋势图在；未登录打开 `/app` 落到 `/login`，没有生成按钮。
- 风险：首页 Hero 演示仍可拖。`App.tsx` 已超 400 行，本轮只加了门闩包装，未拆文件。

### 02:39 · 登录页视觉重做

- 任务：按 frontend-skill / frontend-design 把登录页做得更大气。
- 类型：计划
- 计划：
  1. 视觉命题：墨纸对开，左侧整幅 terracotta 夜色 + 关系星图，右侧留白只放表单。
  2. 内容：品牌最大，欢迎语其次，表单是唯一动作；去掉卡片套卡片。
  3. 动效：入场上浮、星图缓慢呼吸；尊重 reduced-motion。
  4. 浏览器看 `/login` 桌面和窄屏。
- 预期范围：AuthLayout 与登录/注册展示；不改鉴权。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：暗色左栏在浅色站点里反差大，这是刻意的。

### 02:45 · 收回登录页对开布局

- 任务：用户反馈「一搞界面布局都乱了」。继续登录页视觉，先把结构收回去。
- 类型：计划
- 计划：
  1. 核对 `/login`：`data-theme=dark` 把 `--color-bg-base` 和 antd 算法一起染黑，右侧纸面消失。
  2. 账号页本地钉死墨纸对开 token；表单套浅色 ConfigProvider。
  3. 左侧改成 brand / copy / back 三段，标题从 70px 收到约 52px；星图缩小避免抢位置。
  4. 浏览器看 1440 与 390：左夜右纸，表单可填。
- 预期范围：AuthLayout、账号页展示；不改鉴权。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：全站暗色用户进登录页会看到浅色纸面，这是对开设计本身要求的。

### 02:53 · 登录页右侧溢出与密码框

- 任务：用户截图像素上右侧被切、密码框异常。
- 类型：计划
- 计划：
  1. 量过：密码 affix 被写成 70px（内层 input 也套了 min-height: 48px），邮箱是 48px。
  2. 表单改成贴着中缝、可收缩；grid 子项 min-width: 0；窄屏更早单列。
  3. 眼睛图标不受全局 svg max-width 影响。
  4. 浏览器看 1440 / 1024 / 390。
- 预期范围：`auth-layout.css`；不改鉴权。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：无。

### 02:56 · 登录页右侧溢出与密码框

- 任务：用户截图像素上右侧被切、密码框异常。
- 类型：改动 / 验证
- 改动：密码外壳才写 48px，内层 input 不再叠高（原先 affix 被撑到 70px）。表单取消 `margin: 0 auto`，贴中缝；grid 子项 `min-width: 0`；1023 以下单列。眼睛图标不受全局 `svg { max-width: 100% }` 影响。
- 文件：`src/app/auth-layout.css` / `devlog.md`
- 验证：1440 邮箱/密码都是 48×360，眼睛在框内，点「显示」能看到明文，页面无横向滚动。1100 无裁切。390 单列无溢出。注册页同一套壳。
- 风险：Cursor 内嵌预览若比页面视口更窄，仍可能看到右边被窗口裁掉，那是预览窗不是页面溢出。

### 02:59 · 账号页改成手机优先

- 任务：用户指出登录页没有真正做移动端适配。
- 类型：计划
- 计划：
  1. `auth-layout.css` 改成默认单列：顶栏品牌+返回，表单铺满，带 safe-area。
  2. `min-width: 1024px` 才恢复墨纸对开。
  3. 输入框强制 16px，避免 iOS 聚焦放大。
  4. 浏览器看 390 / 768 / 1440。
- 预期范围：账号页壳样式；不改鉴权。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：宽屏预览仍是对开，要用窄视口才能看到手机布局。

### 03:01 · 重写登录页表单样式

- 任务：用户反馈重写后的登录页仍有问题（密码框、溢出、布局）。
- 类型：改动 / 验证
- 改动：去掉密码眼睛按钮 44×44 的 min 尺寸（会把 affix 撑到 66px）；邮箱/密码统一 48px 外壳高度；桌面表单居中；星图不再负定位溢出；样式全部收进 `.auth-main .account-wrap`。
- 文件：`src/app/auth-layout.css` / `devlog.md`
- 验证：1440 邮箱/密码均 48px 同高，表单在右栏居中，无横向滚动。390 单列顶栏+表单，输入 350px 宽无溢出。
- 风险：Cursor 预览窗若比页面窄，右侧黑边是预览容器，不是页面溢出。

### 03:05 · 全站品牌 mark 重设计

- 任务：用户要求重新设计 logo。
- 类型：改动 / 验证
- 改动：新增 `BrandMark` 组件（双实体 + 关系菱形，Chen 记法）；替换顶栏 / 登录 / 管理端三处内联 SVG；补 `public/brand-mark.svg` 作 favicon。
- 文件：`src/app/BrandMark.tsx` / `SiteHeader.tsx` / `AuthLayout.tsx` / `AdminLayout.tsx` / `public/brand-mark.svg` / `index.html`
- 验证：`pnpm typecheck` PASS。
- 风险：旧三框树形 mark 已全部替换；若还要横版 wordmark 需另做。

### 03:09 · 修复品牌 logo 小尺寸不可见

- 任务：用户反馈顶栏 logo「没渲染」——圆底可见、内部 mark 几乎看不见。
- 类型：排查 / 改动 / 验证
- 根因：`assets/base.css` 全局 `svg { max-width: 100% }` 把 32px 圆形容器里的 SVG 压到约 16px；旧版细 stroke 在 16px 下对比度不足。
- 改动：`BrandMark` 改为填充实心实体/菱形 + 较粗连线；新增 `brand-mark.css` 统一尺寸并 `max-width: none`；`main.tsx` 全局引入；顶栏 SVG 22px、管理端 18px；同步 `public/brand-mark.svg`。
- 文件：`BrandMark.tsx` / `brand-mark.css` / `main.tsx` / `public/brand-mark.svg` / `user-layout.css` / `auth-layout.css` / `admin-layout.css`
- 验证：`pnpm typecheck` PASS；浏览器 `localhost:5173` 顶栏橙色圆底 + 白色 ER mark 可见。
- 风险：浏览器 tab favicon 需硬刷新才更新缓存。

### 03:12 · 错误提示改 message + SEO 基础优化

- 任务：用户要求错误用 antd message 而非 alert；完善 SEO 便于收录。
- 类型：计划 / 改动 / 验证
- 改动：
  - 新增 `feedback.ts`（`showError` / `showSuccess`），登录/注册/管理端/生成器解析与导出错误统一 toast。
  - 移除各页 inline `Alert` 错误条与画布错误 overlay；保留解析 warning 的 Alert。
  - 新增 `SeoHead` + `seo.ts`：按路由写 title/description/robots/OG/Twitter/canonical/JSON-LD。
  - `index.html` 补默认 meta 与 noscript 摘要；`public/robots.txt`；构建后 `scripts/write-sitemap.mjs` 写 `dist/sitemap.xml`。
  - CI Pages 构建注入 `VITE_SITE_URL`；根目录 `.env.example` 说明站点 URL。
- 文件：`feedback.ts` / `SeoHead.tsx` / `seo.ts` / `router.tsx` / `App.tsx` / 登录注册与管理页 / `EditorWorkspace.tsx` / `index.html` / `robots.txt` / `write-sitemap.mjs` / `pages.yml` / `.env.example`
- 验证：`pnpm typecheck` PASS；`VITE_SITE_URL=http://localhost:5173 pnpm build` PASS（sitemap 5 urls）。
- 风险：SPA 无 SSR，仅执行 JS 的爬虫能拿到路由级 meta；上线需在 `.env` 或 CI 配真实 `VITE_SITE_URL`。

### 03:22 · 管理端用户搜索与操作筛选

- 任务：用户要求补用户搜索、操作筛选等基础管理能力。
- 类型：改动 / 验证
- 改动：
  - 后端 `GET /api/admin/users` 增 `q` / `role` / `disabled`；`GET /api/admin/ops` 增 `q`（邮箱/显示名）。
  - 用户页：搜索 + 角色 + 状态筛选，查询/重置；操作页：用户关键词 + ID + 动作 + 日期，查询/重置。
  - 修复 `setUserDisabled` 前端路径为 `/disabled`；用户表加 ID 列；筛选表单样式 `admin-filter-form`。
- 文件：`server/src/db/*` / `admin.schema|service|controller` / `AdminUsersPage` / `AdminOpsPage` / `api.ts` / `filters.ts` / `columns.tsx` / `admin-layout.css` / `api.md` / `app.test.ts`
- 验证：`pnpm typecheck` PASS；server test 16 PASS；frontend test 256 PASS。
- 风险：MySQL 用户量大时 `LIKE` 需索引；当前规模足够。

### 03:26 · 修复管理端 columns 模块 404

- 任务：用户报浏览器 `404 Not Found`；Vite 日志显示找不到 `columns.ts` / `columns.tsx`。
- 类型：排查 / 改动
- 根因：列定义从 `columns.ts` 重命名为 `columns.tsx` 后，Vite HMR 仍缓存旧路径，热更新请求 `/src/features/admin/columns.ts` 404。
- 改动：实现迁至 `adminColumns.tsx`；新增 `columns.ts` 稳定 re-export 入口；重启 dev server 清缓存。
- 文件：`adminColumns.tsx` / `columns.ts`（删除旧 `columns.tsx`）
- 验证：重启 Vite 后 `/admin/users` 正常（未登录跳登录页）；`pnpm typecheck` PASS。
- 风险：若再改列文件路径，需硬刷新或重启 Vite。

### 03:18 · 管理端 PV/UV + 用户禁用 + 双趋势图（前端）

- 任务：实现埋点、管理端访问/使用趋势、用户禁用/启用 UI。
- 类型：改动 / 验证
- 改动：
  - `features/analytics/track.ts`：localStorage visitorId + `trackPageView` POST `/api/track`。
  - `PageTracker.tsx` 挂 router，路由切换上报。
  - `api.ts`：`DayStat` 增 pv/uv、`AdminUser.disabled`、`setUserDisabled` PATCH；re-export `trackPageView`。
  - `trafficTrend.ts` / `AdminTrafficChart.tsx`：PV/UV 图；`dailyTrend` 仅使用系列。
  - `columns.tsx`：日表 PV/UV 列；用户状态 + Popconfirm 禁用/启用。
  - `AdminOverviewPage`：6 指标卡 + 访问/使用双图；`AdminUsersPage` 禁用流程 + message 反馈。
- 文件：`track.ts` / `PageTracker.tsx` / `router.tsx` / `api.ts` / `trafficTrend.ts` / `AdminTrafficChart.tsx` / `dailyTrend.ts` / `columns.tsx` / `AdminOverviewPage.tsx` / `AdminUsersPage.tsx` / `admin-daily-trend.test.ts`
- 验证：`pnpm typecheck` PASS；`pnpm test src/test/admin-daily-trend.test.ts` PASS（2 tests）。
- 风险：后端 `/api/track` 与 PATCH `/api/admin/users/:id` 需同步落地，否则埋点静默失败、禁用操作 toast 报错。

### 03:19 · 管理端 PV/UV + 用户禁用（后端）

- 任务：落地 page_views 表、公开埋点、管理员禁用用户、禁用登录拦截。
- 类型：改动 / 验证
- 改动：
  - `db/types.ts`：`UserRecord.disabled`、`DayStat.pvCount/uvCount`、`insertPageView` / `setUserDisabled`。
  - `db/mysql.ts`：information_schema 补 `users.disabled` 列、`page_views` 表、dailyStats 合并 ops + PV/UV。
  - `db/memory.ts`：同上内存实现；禁用最后一个 admin 抛 40302。
  - `modules/track/*`：公开 `POST /api/track`；`app.ts` 挂载。
  - `modules/admin/*`：`PATCH /users/:id/disabled`；用户列表带 `disabled`。
  - `auth.service` / `middleware/auth`：禁用账号登录 40303；`loadUser` 禁用视为未登录。
  - `lib/errors.ts`：40302 / 40303 / 40401。
  - `app.test.ts`：track、PV/UV 合并、禁用用户、禁用登录、禁用 Cookie 失效。
- 文件：`server/src/db/*` / `server/src/modules/track/*` / `server/src/modules/admin/*` / `server/src/modules/auth/auth.service.ts` / `server/src/middleware/auth.ts` / `server/src/lib/errors.ts` / `server/src/app.ts` / `server/src/app.test.ts`
- 验证：`npm test`（server/）PASS（14 tests）。
- 风险：MySQL 首次 migration 需可连库；既有 users 表通过 ALTER 补 disabled 列。

### 03:26 · 每日情况 ECharts + 管理端固定布局

- 任务：概览页「每日情况」改 ECharts 分组柱图；管理端侧栏与 header 固定，仅内容区滚动。
- 类型：计划
- 计划：
  1. 新增 `dailyOverviewTrend.ts` / `AdminDailyOverviewChart.tsx`，六项指标分组柱图替换 Table。
  2. `admin-layout.css`：`admin-shell` 100dvh + overflow hidden；sider sticky；`admin-main` flex 列；header sticky；content 独立滚动。
  3. `AdminLayout.tsx` 内层 Layout 加 `admin-main` class。
  4. 补 `buildDailyOverviewOption` 单测；跑 typecheck / test。
- 预期范围：管理端概览与布局 CSS/组件；不改后端。
- 文件：无（计划阶段）
- 验证：未跑
- 风险：移动端 Drawer 模式 header 需单独 sticky，内容区滚动勿影响抽屉。

### 03:28 · 每日情况 ECharts + 管理端固定布局

- 任务：概览页「每日情况」改 ECharts；管理端侧栏/header 固定。
- 类型：改动 / 验证
- 改动：
  - `dailyOverviewTrend.ts` / `AdminDailyOverviewChart.tsx`：近 7 日 PV/UV/新用户/登录/生成/导出分组柱图。
  - `AdminOverviewPage.tsx`：底部 Table 换 `AdminDailyOverviewChart`。
  - `admin-layout.css`：`admin-shell` 100dvh；sider sticky + menu 内滚；`admin-main` flex 列；header sticky；`admin-content` 独立纵向滚动。
  - `AdminLayout.tsx`：内层 Layout 加 `admin-main`。
  - `admin-daily-trend.test.ts`：补 `buildDailyOverviewOption` 单测。
- 文件：`dailyOverviewTrend.ts` / `AdminDailyOverviewChart.tsx` / `AdminOverviewPage.tsx` / `admin-layout.css` / `AdminLayout.tsx` / `admin-daily-trend.test.ts`
- 验证：`pnpm typecheck` PASS；`pnpm test src/test/admin-daily-trend.test.ts` PASS（3 tests）。
- 风险：无。

### 03:34 · 多表 ZIP 导出（按表 png/svg/drawio）

- 任务：多表 ER 图一键导出 ZIP，每张表各含 png / svg / draw.io。
- 类型：改动 / 验证
- 改动：
  - `tableExportZip.ts`：按表切分子图、文件名消毒、zip 条目组装。
  - `exporter.ts`：`buildExportSVG` 支持 `graphData` / `includeDrawio`；新增 `exportZIP`。
  - `useGraph.ts`：暴露 `tableList`；`App` / `EditorWorkspace`：表数 ≥2 时导出菜单显示 ZIP。
  - 依赖 `fflate`；i18n 补 ZIP 错误文案。
- 文件：`tableExportZip.ts` / `exporter.ts` / `useGraph.ts` / `App.tsx` / `EditorWorkspace.tsx` / `useExportButton.ts` / `i18n.ts` / `table-export-zip.test.ts`
- 验证：`pnpm typecheck` PASS；`pnpm test src/test/table-export-zip.test.ts` PASS（4 tests）。
- 风险：单表子图仅含实体+属性，不含跨表关系菱形；表名重复时文件名自动加 `-2` 后缀。

### 03:36 · ZIP 内按格式分目录

- 任务：ZIP 内 png / svg / drawio 分三个目录，不再平铺在根目录。
- 类型：改动 / 验证
- 改动：`composeTableZipEntries` 路径改为 `png/{表}.png`、`svg/{表}.svg`、`drawio/{表}.drawio`；导出菜单文案同步。
- 文件：`tableExportZip.ts` / `table-export-zip.test.ts` / `EditorWorkspace.tsx`
- 验证：`pnpm test src/test/table-export-zip.test.ts` PASS（4 tests）。
- 风险：无。

### 03:40 · 用户 IP / UA 审计记录

- 任务：全面记录用户 IP、User-Agent；管理端可查询访问与操作明细。
- 类型：改动 / 验证
- 改动：
  - `requestMeta.ts`：统一解析 IP（X-Forwarded-For / X-Real-IP）与 User-Agent。
  - DB：`users.register_ip` / `last_login_ip`；`ops.user_agent`；`page_views.user_agent`。
  - 注册/登录/退出/生成/导出/PV 埋点均写入 IP + UA。
  - 管理端新增「访问记录」页 `GET /api/admin/page-views`；用户列表展示注册/最近登录 IP；操作记录增 UA 与 IP 筛选。
- 文件：`requestMeta.ts` / `db/*` / `auth.*` / `ops.controller.ts` / `track.controller.ts` / `admin/*` / `AdminVisitsPage.tsx` / `adminColumns.tsx` / `api.md`
- 验证：`npm test`（server/）PASS（20 tests）；`pnpm typecheck` PASS。
- 风险：反代需正确透传 `X-Forwarded-For`；历史数据新字段为 null。

### 04:08 · 修复移动端生成器无法纵向滚动

- 任务：生产环境生成页在手机上无法向下滑动，底部内容被遮住。
- 类型：计划 / 改动
- 根因：`.user-layout--editor` 锁死 `100vh` + `flex:1; overflow:hidden`；G6 `drag-canvas` 在 touch 上拦截页面滚动。
- 计划：移动端改为整页滚动并重置 flex；窄屏禁用 drag-canvas；预览区固定高度避免撑破视口。
- 文件：`user-layout.css` / `editor.css` / `EditorWorkspace.tsx` / `createERGraph.ts`
- 验证：`pnpm typecheck` PASS。
- 风险：窄屏下画布暂不支持单指拖动画布，需双指缩放或节点拖拽；待部署后真机复测。

### 04:12 · 预览全屏按钮 + 路由滚动复位

- 任务：生成器预览区增加全屏按钮；进入新路由不受上一页滚动位置影响。
- 类型：改动
- 改动：`usePreviewFullscreen`（原生全屏 + iOS 沉浸层回退）；`ScrollToTop` + `resetAppScroll`；预览工具栏全屏按钮。
- 文件：`usePreviewFullscreen.ts` / `ScrollToTop.tsx` / `EditorWorkspace.tsx` / `editor.css` / `router.tsx` / `i18n.ts`
- 验证：`pnpm typecheck` PASS。

### 04:14 · 联系作者页

- 任务：新增作者介绍与微信联系方式单页。
- 类型：改动
- 改动：`ContactPage`（/contact）；顶栏/页脚「联系作者」；SEO 与 sitemap。
- 微信：`coder_Thorleying`；简介含全栈 3 年、Java / Python / 逆向等。
- 文件：`ContactPage.tsx` / `router.tsx` / `SiteHeader.tsx` / `SiteFooter.tsx` / `user-layout.css` / `seo.ts` / `write-sitemap.mjs`
- 验证：`pnpm typecheck` PASS；已部署生产。

### 04:18 · Schema Studio 生成器界面重设计

- 任务：SQL 生成界面与开源双 Card 区分，按 frontend-design skill 重塑视觉。
- 类型：改动
- 方向：暖色蓝图工作台 — 深色代码井、步骤胶囊、底部玻璃工具坞、渐变生成 CTA。
- 文件：`EditorWorkspace.tsx` / `editor.css` / `user-layout.css`
- 验证：`pnpm typecheck` PASS；已部署生产。

### 04:29 · P1 工程与运维完善

- 任务：CI 跑后端测试；MySQL 备份/恢复；pm2 日志与轮转；README 与生产 env 模板。
- 类型：计划 / 改动 / 验证
- 计划：
  1. CI 增加 `npm ci/test/typecheck --prefix server`；根脚本 `test:server`。
  2. 新增 `server/.env.production.example`、`deploy/ecosystem.config.cjs`、`mysql-backup.sh`、`mysql-restore.sh`、`setup-pm2-logs.sh`。
  3. `remote-install.sh` 改用 ecosystem + 日志初始化；`upload.sh` 同步 deploy 目录。
  4. 扩充根 `README.md`、`deploy/README.md`；`server.ts` 注册 uncaught/unhandled 日志。
- 改动：
  - `.github/workflows/ci.yml`：后端 install / typecheck / test。
  - `package.json`：`test:server`、`typecheck:server`，`check` 含后端。
  - `deploy/*`：备份脚本（14 天保留）、pm2-logrotate、ecosystem 日志路径。
  - `server/src/lib/processHandlers.ts` + `server.ts` 进程级异常日志。
  - 文档：`README.md`、`deploy/README.md`、`server/.env.production.example`。
- 文件：见上；无业务 UI 改动。
- 验证：`pnpm typecheck` PASS（265 tests）；`npm test --prefix server` PASS（20 tests）。
- 风险：生产需手动执行一次 `setup-pm2-logs.sh` 与 crontab 备份；已有 pm2 进程需 `remote-install` 或 `pm2 restart` 切 ecosystem。

### 04:37 · 分享只读链接

- 任务：生成器可创建只读分享链接；公开页 `/s/:token` 查看；部署生产。
- 类型：计划 / 改动 / 验证 / 发布
- 改动：
  - 后端：`shares` 表；`POST/GET/DELETE /api/shares`；`ops.action=share`；修复 `40401` HTTP 状态映射。
  - 前端：分享按钮 + `ShareLinkModal`；`SharePage` 只读模式；`useGraph`/`App`/`EditorWorkspace` readOnly 支持。
  - 契约：`docs/contracts/api.md` 补 Shares 段。
- 文件：`server/src/modules/shares/*` / `db/*` / `SharePage.tsx` / `features/share/*` / `App.tsx` / `EditorWorkspace.tsx` / `useGraph.ts` / `createERGraph.ts` / `router.tsx` / `i18n.ts` / `api.md` / `errors.ts`
- 验证：`pnpm typecheck` PASS（268 tests）；`npm test --prefix server` PASS（23 tests）。
- 风险：分享会上传 SQL/DBML 原文至服务端，默认 90 天过期；需在隐私政策中已知悉。

### 04:49 · 生产部署（分享功能上线）

- 任务：用户要求部署；线上缺少分享按钮因上次 rsync 失败。
- 类型：发布 / 验证
- 操作：密码 SSH rsync dist/server/deploy → `npm ci` → `pm2 restart er-sasashui-api`。
- 修复：`npm ci --omit=dev` 会缺 `tsx` 导致 API 起不来，改为完整 `npm ci`（已更新 remote-install/README）。
- 验证：线上 `index-CHKj7d8K.js` 含「分享链接」；`/api/auth/me` 401 正常；无效 share token 404。
- 未动：`hm-backend`（7001）仍 online。

### 13:19 · 数据库导出与新 GitHub 仓库

- 任务：SQL 导出到项目目录；commit + push；创建 GitHub 仓库。
- 类型：改动 / 发布
- 说明：本机 3306 未运行，从生产 mysqldump 拉取至 `database/dumps/er_sasashui-20260829.sql.gz`；另增 `database/schema.sql`。
- 仓库：https://github.com/Thorleying/er-sasashui（public）；原 `ystemsrx/sql_to_ER` 远程改名为 `upstream`。
- 提交：`76ceebc` feat(platform): ER洒洒水全栈平台与数据库导出
- 未提交：`server/.env`（仍在 .gitignore）
