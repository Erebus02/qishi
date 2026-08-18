import { apiFailure, ApiError, currentApiUser } from "../../../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../../../lib/server-data";

const permissions = {
  forward: "approval.forward",
  add_sign: "approval.add_sign",
  delete: "approval.delete",
  retrieve: "approval.retrieve",
  cancel: "approval.cancel",
  complete: "approval.complete",
} as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json() as { action?: keyof typeof permissions; assignee?: string };
    if (!payload.action || !permissions[payload.action]) throw new ApiError(400, "INVALID_WORKFLOW_ACTION", "流程操作无效");
    const user = await currentApiUser(permissions[payload.action]);
    const version = await getRawDb().prepare("SELECT id,status,owner_user_id FROM device_versions WHERE id=?").bind(id).first<Record<string, string | null>>();
    if (!version) throw new ApiError(404, "VERSION_NOT_FOUND", "审批流程不存在");
    if (["retrieve", "cancel"].includes(payload.action) && version.owner_user_id !== user.id && !user.permissions.includes("approval.delete")) throw new ApiError(403, "OWNER_REQUIRED", "只有申请人可以取回或撤销流程");
    if (["forward", "add_sign"].includes(payload.action) && !payload.assignee?.trim()) throw new ApiError(400, "ASSIGNEE_REQUIRED", "请填写转发或加签人员");
    const nextStatus = payload.action === "retrieve" ? "draft" : payload.action === "cancel" ? "cancelled" : payload.action === "complete" ? "completed" : payload.action === "delete" ? "deleted" : null;
    if (nextStatus) await getRawDb().prepare("UPDATE device_versions SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(nextStatus, id).run();
    await writeAudit(user.id, `approval.${payload.action}`, "device_version", id, { assignee: payload.assignee || null, previousStatus: version.status, nextStatus });
    return Response.json({ ok: true, status: nextStatus || version.status });
  } catch (error) { return apiFailure(error); }
}
