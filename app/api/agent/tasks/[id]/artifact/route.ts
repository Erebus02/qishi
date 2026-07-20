import { env } from "cloudflare:workers";
import { apiFailure, ApiError } from "../../../../../../lib/api-auth";
import { requireAgent } from "../../../../../../lib/agent-auth";
import { getRawDb, newId } from "../../../../../../lib/server-data";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const agent = await requireAgent(request);
    const { id: taskId } = await context.params;
    const task = await getRawDb().prepare("SELECT id,device_id,version_id,assigned_agent_id FROM tasks WHERE id=?").bind(taskId).first<Record<string, string | null>>();
    if (!task) throw new ApiError(404, "TASK_NOT_FOUND", "任务不存在");
    if (task.assigned_agent_id !== agent.id) throw new ApiError(403, "TASK_NOT_ASSIGNED", "任务未分配给当前执行端");
    if (!env.BUCKET) throw new Error("Object storage binding is unavailable");
    const fileName = request.headers.get("x-file-name") || `${taskId}.bin`;
    const objectKey = `task-results/${taskId}/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await env.BUCKET.put(objectKey, request.body, { httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" } });
    const head = await env.BUCKET.head(objectKey);
    const fileId = newId("file");
    await getRawDb().prepare(`INSERT INTO files (id,device_id,version_id,file_name,object_key,content_type,size_bytes,role)
      VALUES (?,?,?,?,?,?,?,'task_result')`).bind(fileId, task.device_id, task.version_id, fileName, objectKey, request.headers.get("content-type") || "application/octet-stream", head?.size || 0).run();
    return Response.json({ fileId, objectKey }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
