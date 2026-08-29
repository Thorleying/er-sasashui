# Todo

## 待完成

- [ ] T-10 · 补前端/后端测试与浏览器验收 · 详情：`docs/specs/er-platform.md` §7

## 进行中

- [ ] T-9 · 本地 MySQL 3306 起来后再切回真实库 · 详情：`docs/contracts/api.md`
- [ ] T-25 · 按设计 skills 重做登录页视觉 · 详情：墨纸对开 + 关系星图，不改鉴权

## 已完成

- [x] 2026-08-29 02:38 · T-24 · 管理端加 ECharts；生成/导出前再校验登录态 · 验证：typecheck PASS / test 248 PASS / 浏览器 `/admin` 有趋势图 / 未登录 `/app` 回登录

- [x] 2026-08-29 02:34 · T-23 · 去掉账号页说明文案；管理端改成侧栏 B 端后台 · 验证：typecheck PASS / test 247 PASS / 浏览器 `/login` `/admin` `/admin/users` `/admin/ops`

- [x] 2026-08-29 02:22 · T-21 · 协议名加书名号；改首页导语并加免费使用亮标 · 验证：typecheck PASS / test 244 PASS / 浏览器 `/` `/register`

- [x] 2026-08-29 02:20 · T-20 · 登录注册去掉全站页脚，协议入口改进行内 · 验证：typecheck PASS / test 244 PASS / 浏览器 `/login` 无底部页脚条

- [x] 2026-08-29 02:16 · T-19 · 用户协议 / 隐私政策 / 页脚；注册不再填显示名 · 验证：typecheck PASS / test 244 PASS / server test 6 PASS / 浏览器 `/terms` `/privacy` `/register` 无显示名字段

- [x] 2026-08-29 00:25 · T-1 · 删除 Agent Skill 及其引用 · 验证：typecheck PASS / test 238 PASS
- [x] 2026-08-29 00:25 · T-2 · 工具页升为首页 · 验证：`/` 进入编辑器
- [x] 2026-08-29 00:32 · T-3 · 去掉作者与 GitHub 入口 · 验证：首页无折角 / 无原仓库链接
- [x] 2026-08-29 00:32 · T-4 · 删除第三方字体 · 验证：`assets/fonts/` 已删 / test 238 PASS
- [x] 2026-08-29 00:32 · T-5 · 首页品牌与 slogan 重构 · 验证：浏览器见「ER洒洒水」并能生成 ER 图
- [x] 2026-08-29 00:40 · T-6 · 停掉双 HTML 方案，改走 React Router 规格 · 验证：规格已写入 `docs/specs/er-platform.md`
- [x] 2026-08-29 00:51 · T-11 · 修好首页 Hero ER 空盒 · 验证：`#hero-er` 有 canvas，`/app.html` 编辑器在
- [x] 2026-08-29 00:53 · T-8 · Node 认证与管理接口 · 验证：`server` typecheck PASS / test 5 PASS
- [x] 2026-08-29 01:00 · T-12 · 欢迎页补完整（Hero 高度 / 失败文案 / 特性用法） · 验证：CTA 仍指向 `/app.html`，无第三方字体
- [x] 2026-08-29 01:15 · T-7 · 标准 React SPA 脚手架（欢迎页 / 编辑器 / 登录注册 / 管理端） · 验证：浏览器 `/` `/app` `/login` `/register` `/admin`
- [x] 2026-08-29 01:15 · T-13 · 对接登录注册并按 UI 规范重构前端壳层 · 验证：登录/注册成功，管理端见用户与操作
- [x] 2026-08-29 01:31 · T-14 · 用户端对接 antd 并重构布局 · 验证：typecheck PASS / test 243 PASS / 浏览器 `/` `/app` `/login` `/admin`
- [x] 2026-08-29 01:58 · T-15 · 用户端移动适配 · 验证：390 宽顶栏单行汉堡菜单 / 欢迎页与登录无横向溢出
- [x] 2026-08-29 02:03 · T-16 · 生成必须登录 + 重构首页 · 验证：未登录 `/app` 跳登录 / 已登录可进生成器
- [x] 2026-08-29 02:07 · T-17 · 去掉英文切换，界面固定中文 · 验证：顶栏无 EN / typecheck PASS / test 243 PASS
- [x] 2026-08-29 02:10 · T-18 · 默认关着色 + 独立登录布局 · 验证：着色按钮未按下 / 登录页无全站顶栏
