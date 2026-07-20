# ModelFlow SolidWorks Windows 执行端

该程序在安装了 SolidWorks 的 Windows 电脑上运行，负责从 ModelFlow 领取任务、调用 SolidWorks COM API，并把结果回传到服务器。

## 运行条件

- Windows 10/11 x64；
- .NET 8 Desktop Runtime 或 SDK；
- SolidWorks 2026，或经验证兼容的版本；
- 有效的 SolidWorks 许可证；
- 运行账号对模型目录具有读写权限；
- 建议使用“仅当用户登录时运行”的计划任务，不建议作为 Session 0 Windows 服务运行。

## 1. 在网页端创建执行节点

使用系统管理员账号调用 `POST /api/agents`：

```json
{
  "name": "设计部建模机 01",
  "machineName": "DESIGN-PC-01"
}
```

接口只会返回一次 `swagt_...` 令牌。不要把令牌提交到代码仓库。

## 2. 配置环境变量

以管理员 PowerShell 执行：

```powershell
[Environment]::SetEnvironmentVariable("SW_AGENT_SERVER", "https://你的站点地址", "User")
[Environment]::SetEnvironmentVariable("SW_AGENT_TOKEN", "swagt_替换为真实令牌", "User")
[Environment]::SetEnvironmentVariable("SW_AGENT_NAME", $env:COMPUTERNAME, "User")
[Environment]::SetEnvironmentVariable("SW_AGENT_POLL_SECONDS", "5", "User")
```

重新打开 PowerShell 后变量生效。

## 3. 构建与运行

```powershell
dotnet publish .\ModelFlow.SolidWorksAgent.csproj -c Release -r win-x64 --self-contained false
.\bin\Release\net8.0-windows\win-x64\publish\ModelFlow.SolidWorksAgent.exe
```

## 4. 设置开机运行

在“任务计划程序”中新建任务：

- 触发器：用户登录时；
- 操作：启动 `ModelFlow.SolidWorksAgent.exe`；
- 勾选“仅当用户登录时运行”；
- 使用拥有 SolidWorks 许可证和模型目录权限的 Windows 用户；
- 不勾选“隐藏”，便于初期观察日志。

## 已实现任务

- `generate_thumbnail`：生成模型缩略图；
- `extract_properties`：提取自定义属性；
- `extract_bom`：提取装配体组件树；
- `export_pdf`：导出 PDF；
- `export_dxf`：导出 DXF；
- `pack_and_go`：打包引用文件；
- `rebuild_check`：重建并返回错误和警告。

## 安全说明

- 执行端令牌在服务器中只保存 SHA-256 哈希；
- 令牌仅放在 Windows 用户环境变量或企业密钥管理工具中；
- 每个执行节点使用独立令牌，电脑停用后应在管理端撤销对应节点；
- 不要让执行端接受来自任务参数的任意脚本或命令；
- 工作目录每个任务隔离，任务结束后自动清理。
