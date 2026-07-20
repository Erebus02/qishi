import { apiFailure, ApiError } from "../../../../../../lib/api-auth";
import { requireAgent } from "../../../../../../lib/agent-auth";
import { getRawDb } from "../../../../../../lib/server-data";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireAgent(request);
    const { id } = await context.params;
    const payload = await request.json() as { success?: boolean; result?: unknown; error?: string };
    const task = await getRawDb().prepare("SELECT id,assigned_agent_id,status FROM tasks WHERE id=?").bind(id).first<Record<string, string>>();
    if (!task) throw new ApiError(404, "TASK_NOT_FOUND", "任务不存在");
    if (task.assigned_agent_id !== agent.id) throw new ApiError(403, "TASK_NOT_ASSIGNED", "任务未分配给当前执行端");
    await getRawDb().prepare(`UPDATE tasks SET status=?,result=?,error_message=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(payload.success ? "succeeded" : "failed", JSON.stringify(payload.result || {}), payload.error || null, id).run();
    return Response.json({ ok: true });
  } catch (error) { return apiFailure(error); }
}
