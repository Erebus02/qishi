import { apiFailure, ApiError, currentApiUser } from "../../../../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../../../../lib/server-data";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentApiUser("version.submit");
    const { id: deviceId } = await context.params;
    const version = await getRawDb().prepare(`SELECT v.id,v.status,v.owner_user_id FROM devices d
      JOIN device_versions v ON v.id=d.current_version_id WHERE d.id=? AND d.deleted_at IS NULL`).bind(deviceId)
      .first<{ id: string; status: string; owner_user_id: string | null }>();
    if (!version) throw new ApiError(404, "VERSION_NOT_FOUND", "设备当前版本不存在");
    if (version.status !== "draft") throw new ApiError(409, "INVALID_VERSION_STATUS", "只有草稿版本可以提交审批");
    if (version.owner_user_id !== user.id && !user.permissions.includes("role.manage")) {
      throw new ApiError(403, "NOT_VERSION_OWNER", "只能提交自己创建的版本");
    }
    await getRawDb().prepare("UPDATE device_versions SET status='in_review',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='draft'").bind(version.id).run();
    await writeAudit(user.id, "version.submit", "device_version", version.id, { deviceId });
    return Response.json({ ok: true, status: "in_review" });
  } catch (error) { return apiFailure(error); }
}
