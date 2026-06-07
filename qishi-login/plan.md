# 起势（极简钓鱼助手）— 前端实现计划

依据 Figma Make 文件 [`还原登录页设计`](https://www.figma.com/make/rAdXNLJ8sdXRkozQ64DlCq/) 中的 `App.tsx` 与 `pages/*` 源码整理。本仓库用 **Next.js App Router** 拆成独立路由，底部 Tab 与「全屏钓点详情」分层，便于继续迭代。

## 信息架构与路由

| 模块 | 路径 | 说明 |
|------|------|------|
| 登录 | `/login` | 一键登录 / 验证码与密码入口 / 第三方 / 协议 |
| 地图首页 | `/map` | 模拟地图、搜索、作钓记录、附近钓点卡片 |
| 钓点列表 | `/spots` | Tab 筛选、列表、`查看` 进详情 |
| 作钓记录 | `/records` | 统计头图、记录卡片 |
| 工具箱 | `/tools` | 天气、咬钩指数、潮汐/识鱼/禁钓期等 |
| 我的 | `/profile` | 用户信息、菜单、版本号 |
| 钓点详情 | `/spot/[id]` | **无底部 Tab**（与 Figma 全屏详情一致） |

`(main)` 路由组：`/map`、`/spots`、`/records`、`/tools`、`/profile` 共用带 **BottomNav** 的布局。`/spot/[id]` 置于组外，避免详情页再叠一层 Tab。

## 阶段规划

### Phase 0 — 骨架（当前）

- [x] `plan.md` 与路由、组件目录约定  
- [x] 底部导航与五 Tab 页面可跳转（`/map` `/spots` `/records` `/tools` `/profile`）  
- [x] 钓点详情独立路由（`/spot/[id]`，无底部 Tab）  
- [x] 从 Figma Make 迁移各页 UI 至 `src/components/pages/*-view.tsx`  

### Phase 1 — 数据与导航

- [ ] 登录态（Cookie / Session）与未登录跳转 `/login`  
- [ ] `/` 根据登录态跳转 `/map` 或 `/login`  
- [ ] 钓点列表与详情用同一套类型（`Spot`）与 `id`  

### Phase 2 — 业务能力

- [ ] 地图接入真实地图 SDK（或静态瓦片）  
- [ ] 作钓轨迹上传 / 本地离线队列（「无网也能钓」）  
- [ ] 工具箱接口：天气、潮汐、禁钓区数据源  

### Phase 3 — 工程化

- [ ] E2E（登录 → 地图 → 钓点详情）  
- [ ] CI、`next build` 在 Node 20+ 环境锁定  

## 组件约定

- 重交互页面放在 `src/components/pages/*-view.tsx`（`"use client"`），`app/**/page.tsx` 只做组合与 SEO。  
- 共享导航：`src/components/app/bottom-nav.tsx`。  
- 品牌色与 Figma 一致：`#1E90FF`、hover `#1873CC`。

## 设计稿对照

实现时以 Figma Make 中各 `*Page.tsx` 为像素与文案参考；浅色/深色在全局 `globals.css` 的 `prefers-color-scheme` 策略上扩展各 View 的 `dark:` 类即可逐步对齐。
