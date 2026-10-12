# ModelFlow — SolidWorks 设备建模管理平台

ModelFlow 是一个已接入真实数据库、登录鉴权、RBAC 权限和 SolidWorks Windows 执行端的全栈设备数据管理系统。前端使用 Next.js/Vinext，服务端运行于 Cloudflare Workers，D1 保存业务数据，R2 保存模型、图纸、缩略图和任务产物。

## 已实现能力

- ChatGPT 登录：未登录访问自动进入登录流程，服务端依据可信身份头识别用户。
- RBAC：管理员、设计工程师、审核工程师、只读用户；API 与界面均校验权限。
- 设备与版本：设备、缩略图、版本、更新点、项目归属和生命周期状态的增删改查。
- 设备变更：多选设备、填写变更批次/原因/实施日期/影响说明，提交 ECO 申请并审批；禁止申请人自审，驳回必须填写原因。
- 文件存储：文件元数据保存到 D1，文件内容流式上传到 R2。
- Windows 执行端：轮询任务、调用本机 SolidWorks COM、生成缩略图/PDF/DXF/BOM/属性/Pack and Go，并回传产物。
- 审计：设备、版本、文件、执行任务、权限和变更审批均写入操作日志。

## 数据与权限

数据库结构见 `db/schema.ts`，迁移见 `drizzle/`。首次成功登录的用户自动成为系统管理员，后续首次登录用户默认为设计工程师。生产环境建议管理员在“权限管理”中调整角色，并结合 Sites 访问策略限制组织范围。

主要权限包括 `device.*`、`version.*`、`file.*`、`task.*`、`agent.*`、`role.manage`、`audit.read` 以及 `change.read/create/submit/approve`。权限始终在 API 服务端再次验证，隐藏按钮不是安全边界。

## SolidWorks Windows 执行端

源码位于 `windows-agent/`，要求 Windows 10/11、.NET 8 SDK 和已安装/激活的 SolidWorks。执行端通过个人令牌访问专用 `/api/agent/*` 接口，不使用网页用户 Cookie。

```powershell
cd windows-agent
$env:SW_AGENT_SERVER="https://你的站点地址"
$env:SW_AGENT_TOKEN="在平台执行端管理中生成的令牌"
dotnet run -c Release
```

SolidWorks COM 依赖交互式桌面。建议通过 Windows 任务计划程序启动，并选择“仅当用户登录时运行”，不要直接作为 Session 0 Windows Service 运行。更多说明见 `windows-agent/README.md`。

## 本地开发与验证

```bash
npm run dev
npm run lint
npm run db:generate
npm run build
```

本地预览没有托管平台注入的登录身份头时，受保护页面会跳转到登录入口，这是预期行为。D1/R2 绑定由 `.openai/hosting.json` 声明为 `DB` 与 `BUCKET`，部署时由 Sites 提供。

## 关键 API

| API | 用途 |
|---|---|
| `GET/POST /api/devices` | 查询或创建设备 |
| `PATCH/DELETE /api/devices/:id` | 更新或软删除设备 |
| `POST /api/devices/:id/versions` | 创建版本草稿 |
| `GET/POST /api/change-orders` | 查询或提交设备变更申请 |
| `POST /api/change-orders/:id/review` | 批准或驳回变更申请 |
| `PUT /api/files` | 流式上传文件到 R2 |
| `GET/POST /api/agents` | 执行端注册与管理 |
| `GET/POST /api/tasks` | SolidWorks 任务查询与创建 |
| `/api/agent/*` | Windows 执行端专用任务与文件接口 |

## 安全注意事项

- 执行端令牌只保存 SHA-256 摘要，明文只在创建时返回一次。
- 不把 SolidWorks 文件通过 JSON/Base64 传输；使用流式请求与 R2 对象存储。
- 变更审批执行职责分离：申请人不能审批本人提交的变更单。
- 删除设备采用软删除；关键业务动作保留审计记录。
- 生产环境应启用 HTTPS、组织访问限制，并定期轮换执行端令牌。
