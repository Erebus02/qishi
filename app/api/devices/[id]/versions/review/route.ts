import { apiFailure, ApiError, currentApiUser } from "../../../../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../../../../lib/server-data";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentApiUser("version.approve");
    const { id: deviceId } = await context.params;
    const payload = await request.json() as { action?: "approve" | "reject"; comment?: string };
    if (!payload.action || !["approve", "reject"].includes(payload.action)) {
      throw new ApiError(400, "INVALID_REVIEW", "审批操作无效");
    }
    if (payload.action === "reject" && !payload.comment?.trim()) {
      throw new ApiError(400, "COMMENT_REQUIRED", "退回时必须填写意见");
    }

    const device = await getRawDb().prepare(`SELECT d.id,d.current_version_id,v.status
      FROM devices d LEFT JOIN device_versions v ON v.id=d.current_version_id
      WHERE d.id=? AND d.deleted_at IS NULL`).bind(deviceId).first<{ id: string; current_version_id: string | null; status: string | null }>();
    if (!device?.current_version_id) throw new ApiError(404, "VERSION_NOT_FOUND", "设备当前版本不存在");
    if (!device.status || !["draft", "in_review"].includes(device.status)) {
      throw new ApiError(409, "INVALID_VERSION_STATUS", "只有草稿或审批中的版本可以审核");
    }

    const status = payload.action === "approve" ? "published" : "draft";
    await getRawDb().prepare(`UPDATE device_versions SET status=?,released_at=CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status, status, device.current_version_id).run();
    await writeAudit(user.id, `version.${payload.action}`, "device_version", device.current_version_id, {
      deviceId, comment: payload.comment?.trim() || "审批通过",
    });
    return Response.json({ ok: true, status });
  } catch (error) { return apiFailure(error); }
}
