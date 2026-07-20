import { apiFailure } from "../../../../../lib/api-auth";
import { requireAgent } from "../../../../../lib/agent-auth";
import { getRawDb } from "../../../../../lib/server-data";

export async function GET(request: Request) {
  try {
    const agent = await requireAgent(request);
    const task = await getRawDb().prepare(`SELECT id,device_id,version_id,type,input_file_id,parameters,attempts
      FROM tasks WHERE status='queued' ORDER BY priority DESC,created_at ASC LIMIT 1`).first<Record<string, string | number>>();
    if (!task) return new Response(null, { status: 204 });
    const claim = await getRawDb().prepare(`UPDATE tasks SET status='running',assigned_agent_id=?,started_at=CURRENT_TIMESTAMP,attempts=attempts+1
      WHERE id=? AND status='queued'`).bind(agent.id, task.id).run();
    if (!claim.meta.changes) return new Response(null, { status: 204 });
    const origin = new URL(request.url).origin;
    return Response.json({
      task: {
        ...task,
        parameters: JSON.parse(String(task.parameters || "{}")),
        inputUrl: task.input_file_id ? `${origin}/api/agent/files/${task.input_file_id}` : null,
        completeUrl: `${origin}/api/agent/tasks/${task.id}/complete`,
        artifactUrl: `${origin}/api/agent/tasks/${task.id}/artifact`,
      },
    });
  } catch (error) { return apiFailure(error); }
}
