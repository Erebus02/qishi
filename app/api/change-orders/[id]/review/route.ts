import { apiFailure, ApiError, currentApiUser } from "../../../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../../../lib/server-data";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentApiUser("change.approve");
    const { id } = await context.params;
    const payload = await request.json() as { action?: "approve" | "reject"; comment?: string };
    if (!payload.action || !["approve", "reject"].includes(payload.action)) throw new ApiError(400, "INVALID_REVIEW", "审批动作无效");
    if (payload.action === "reject" && !payload.comment?.trim()) throw new ApiError(400, "COMMENT_REQUIRED", "驳回时必须填写意见");
    const order = await getRawDb().prepare("SELECT id,status,applicant_user_id FROM change_orders WHERE id=?").bind(id).first<Record<string, string>>();
    if (!order) throw new ApiError(404, "CHANGE_NOT_FOUND", "变更单不存在");
    if (order.status !== "submitted") throw new ApiError(409, "INVALID_CHANGE_STATUS", "只有待审批变更单可以审核");
    if (order.applicant_user_id === user.id) throw new ApiError(409, "SELF_REVIEW_NOT_ALLOWED", "申请人不能审批自己的变更单");
    const status = payload.action === "approve" ? "approved" : "rejected";
    await getRawDb().prepare(`UPDATE change_orders SET status=?,reviewer_user_id=?,review_comment=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='submitted'`)
      .bind(status, user.id, payload.comment?.trim() || "审批通过", id).run();
    await writeAudit(user.id, `change.${payload.action}`, "change_order", id, payload);
    return Response.json({ ok: true, status });
  } catch (error) { return apiFailure(error); }
}
