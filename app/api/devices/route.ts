import { apiFailure, ApiError, currentApiUser } from "../../../lib/api-auth";
import { getRawDb, loadBootstrap, newId, writeAudit } from "../../../lib/server-data";

export async function GET() {
  try {
    const user = await currentApiUser("device.read");
    return Response.json(await loadBootstrap(user));
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentApiUser("device.create");
    const payload = await request.json() as Record<string, string>;
    const code = payload.code?.trim().toUpperCase();
    const name = payload.name?.trim();
    if (!code || !name || !/^[A-Z0-9_-]{3,64}$/.test(code)) throw new ApiError(400, "INVALID_DEVICE", "请填写有效的设备编号和名称");
    const project = await getRawDb().prepare("SELECT id FROM projects WHERE code=? AND status='active'").bind(payload.projectCode || "PRJ-MATERIAL").first<{ id: string }>();
    if (!project) throw new ApiError(400, "PROJECT_NOT_FOUND", "所属项目不存在");
    const deviceId = newId("dev");
    await getRawDb().prepare(`INSERT INTO devices (id,project_id,code,name,category,lifecycle_status,description,owner_user_id,thumbnail_key)
      VALUES (?,?,?,?,?,?,?,?,?)`).bind(deviceId, project.id, code, name, payload.category || "自动化设备", payload.lifecycleStatus || "designing", payload.description || "", user.id, "/devices/powder-transfer-machine.png").run();
    await writeAudit(user.id, "device.create", "device", deviceId, { code, name });
    return Response.json({ id: deviceId }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
