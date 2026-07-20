import { apiFailure, ApiError, currentApiUser } from "../../../lib/api-auth";
import { getRawDb, newId, writeAudit } from "../../../lib/server-data";

export async function GET() {
  try {
    await currentApiUser("task.read");
    const rows = await getRawDb().prepare(`SELECT t.*,d.code device_code,d.name device_name,a.name agent_name FROM tasks t
      LEFT JOIN devices d ON d.id=t.device_id LEFT JOIN agents a ON a.id=t.assigned_agent_id ORDER BY t.created_at DESC LIMIT 100`).all();
    return Response.json({ tasks: rows.results });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentApiUser("task.create");
    const payload = await request.json() as { deviceId?: string; versionId?: string; type?: string; inputFileId?: string; parameters?: unknown; priority?: number };
    const allowed = ["generate_thumbnail", "extract_properties", "extract_bom", "export_pdf", "export_dxf", "pack_and_go", "rebuild_check"];
    if (!payload.type || !allowed.includes(payload.type)) throw new ApiError(400, "INVALID_TASK_TYPE", "不支持的任务类型");
    const taskId = newId("task");
    await getRawDb().prepare(`INSERT INTO tasks (id,device_id,version_id,type,status,priority,input_file_id,parameters,created_by)
      VALUES (?,?,?,?,'queued',?,?,?,?)`).bind(taskId, payload.deviceId || null, payload.versionId || null, payload.type, payload.priority || 0, payload.inputFileId || null, JSON.stringify(payload.parameters || {}), user.id).run();
    await writeAudit(user.id, "task.create", "task", taskId, payload);
    return Response.json({ id: taskId, status: "queued" }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
