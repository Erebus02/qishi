import { apiFailure, ApiError, currentApiUser } from "../../../../../lib/api-auth";
import { getRawDb, newId, writeAudit } from "../../../../../lib/server-data";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentApiUser("version.create");
    const { id: deviceId } = await context.params;
    const payload = await request.json() as Record<string, string | boolean>;
    const device = await getRawDb().prepare("SELECT id,current_version_id FROM devices WHERE id=? AND deleted_at IS NULL").bind(deviceId).first<{ id: string; current_version_id: string | null }>();
    if (!device) throw new ApiError(404, "DEVICE_NOT_FOUND", "设备不存在");
    const versionNo = String(payload.versionNo || "").trim().toUpperCase();
    if (!/^V\d+\.\d+(\.\d+)?$/.test(versionNo)) throw new ApiError(400, "INVALID_VERSION", "版本号格式应为 V1.0 或 V1.0.1");
    const versionId = newId("ver");
    await getRawDb().batch([
      getRawDb().prepare(`INSERT INTO device_versions (id,device_id,version_no,base_version_id,title,summary,status,owner_user_id)
        VALUES (?,?,?,?,?,?,'draft',?)`).bind(versionId, deviceId, versionNo, device.current_version_id, String(payload.title || versionNo), String(payload.summary || ""), user.id),
      getRawDb().prepare("UPDATE devices SET current_version_id=?,updated_at=CURRENT_TIMESTAMP,row_version=row_version+1 WHERE id=?").bind(versionId, deviceId),
      getRawDb().prepare("INSERT INTO change_items (id,version_id,type,title,description,module,severity) VALUES (?,?, 'modified',?,?, 'mechanical','medium')")
        .bind(newId("chg"), versionId, String(payload.title || "版本更新"), String(payload.summary || "")),
    ]);
    await writeAudit(user.id, "version.create", "device_version", versionId, { deviceId, versionNo, ...payload });
    return Response.json({ id: versionId, versionNo }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
