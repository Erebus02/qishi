import { apiFailure, currentApiUser } from "../../../lib/api-auth";
import { createAgentToken, sha256 } from "../../../lib/agent-auth";
import { getRawDb, newId, writeAudit } from "../../../lib/server-data";

export async function GET() {
  try {
    await currentApiUser("agent.manage");
    const rows = await getRawDb().prepare("SELECT id,name,machine_name,solidworks_version,agent_version,status,last_seen_at,created_at FROM agents ORDER BY created_at DESC").all();
    return Response.json({ agents: rows.results });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentApiUser("agent.manage");
    const payload = await request.json() as { name?: string; machineName?: string };
    const token = createAgentToken();
    const agentId = newId("agent");
    await getRawDb().prepare("INSERT INTO agents (id,name,machine_name,token_hash,created_by) VALUES (?,?,?,?,?)")
      .bind(agentId, payload.name?.trim() || "SolidWorks 执行端", payload.machineName?.trim() || "UNASSIGNED", await sha256(token), user.id).run();
    await writeAudit(user.id, "agent.create", "agent", agentId, { name: payload.name, machineName: payload.machineName });
    return Response.json({ id: agentId, token, warning: "令牌只显示一次，请立即保存到 Windows 执行端配置。" }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
