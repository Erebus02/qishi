# ModelFlow 交给 Codex 的发布任务书

## 给 Codex 的直接指令

请读取本项目全部源码和 `README.md`，将其作为一个新的生产项目发布。不要只做静态页面预览，必须保留服务端 API、D1 数据库、R2 文件存储、登录鉴权、RBAC 权限和 SolidWorks Windows 执行端接口。

发布前必须执行并通过：

```bash
npm ci
npm run lint
npm run build
```

## 项目目标

ModelFlow 是 SolidWorks 设备建模管理平台，主要功能包括：

- 设备新增、查询、编辑、软删除；
- 设备缩略图、当前版本、更新点、项目、负责人和状态；
- 新建版本及版本历史；
- 多选设备后填写变更批次，提交工程变更申请；
- 变更申请审批、驳回和审计；
- 用户登录与管理员、设计工程师、审核工程师、只读用户权限；
- R2 模型文件及任务产物存储；
- SolidWorks Windows 执行端任务轮询与结果回传。

## 发布要求

1. 创建新的发布项目，不得复用其他人的项目 ID。`.openai/hosting.json` 中 `project_id` 已设置为 `null`。
2. 创建并绑定 D1 数据库，绑定名称必须是 `DB`。
3. 创建并绑定 R2 Bucket，绑定名称必须是 `BUCKET`。
4. 执行 `drizzle/0000_demonic_psynapse.sql` 和 `drizzle/0001_purple_deathbird.sql`，顺序不可颠倒。
5. 配置生产域名或 Codex 提供的发布网址，确保其他 Windows 电脑可以访问。
6. 保留 HTTPS，不要把身份、执行端令牌或数据库密钥写进前端代码。
7. 如果采用 Sign in with ChatGPT，必须确认非开发电脑能够正常完成登录跳转；如果部署平台不支持该身份头，则将 `app/chatgpt-auth.ts` 替换为平台支持的登录方案，但不得直接取消权限验证。
8. 首次登录用户会成为系统管理员。发布后先用管理员账号登录，再创建其他测试账号。

## 发布后的强制验收

Codex 必须实际操作并记录结果，不得仅检查源代码：

| 编号 | 测试项目 | 合格标准 |
|---|---|---|
| 1 | 新建设备 | 保存后数据库出现设备，刷新仍存在 |
| 2 | 查询设备 | 名称、编号搜索和状态筛选正确 |
| 3 | 编辑设备 | 名称、分类、状态和说明可保存，刷新后保持 |
| 4 | 删除设备 | 二次确认后设备从列表消失，审计记录保留 |
| 5 | 新建版本 | 新版本成为设备当前草稿版本 |
| 6 | 设备变更 | 可多选设备、填写批次并提交审批 |
| 7 | 审批控制 | 申请人不能审批本人申请，驳回必须填写原因 |
| 8 | 权限 | 无编辑/删除权限的账号看不到对应按钮，API 返回 403 |
| 9 | 导出 | 设备清单可下载为 CSV，设备资料可下载 |
| 10 | 跨电脑访问 | 至少用另一台电脑或无痕窗口完成登录并打开工作台 |
| 11 | Windows Agent | 能注册执行端、获取任务并回传完成状态 |

测试新增和删除时，请先创建名称带 `QA-` 的专用测试设备，只删除该测试设备，不要删除样例或正式数据。

## 关键目录

- `app/dashboard-client.tsx`：主要前端交互；
- `app/api/`：业务与执行端 API；
- `db/schema.ts`：数据库结构；
- `drizzle/`：数据库迁移；
- `lib/server-data.ts`：用户初始化、权限和业务数据；
- `windows-agent/`：SolidWorks Windows 执行端；
- `.openai/hosting.json`：D1/R2 发布绑定。

## SolidWorks 执行端发布后配置

把发布后的生产地址写入 Windows 环境变量：

```powershell
$env:MODELFLOW_BASE_URL="https://发布后的生产地址"
$env:MODELFLOW_AGENT_TOKEN="后台生成的执行端令牌"
cd windows-agent
dotnet run -c Release
```

执行端建议使用 Windows 任务计划程序并选择“仅当用户登录时运行”，不要放在 Session 0 服务中运行 SolidWorks COM。
