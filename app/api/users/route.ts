import { apiFailure, ApiError, currentApiUser } from "../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../lib/server-data";

export async function GET() {
  try {
    await currentApiUser("role.manage");
    const users = await getRawDb().prepare(`SELECT u.id,u.email,u.display_name,u.status,u.last_login_at,r.name role_name,r.code role_code
      FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.created_at`).all();
    return Response.json({ users: users.results });
  } catch (error) { return apiFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await currentApiUser("role.manage");
    const payload = await request.json() as { userId?: string; roleId?: string; status?: string };
    if (!payload.userId || !payload.roleId) throw new ApiError(400, "INVALID_USER_UPDATE", "用户配置无效");
    if (payload.userId === actor.id && payload.status === "disabled") throw new ApiError(400, "CANNOT_DISABLE_SELF", "不能停用当前登录账号");
    await getRawDb().prepare("UPDATE users SET role_id=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(payload.roleId, payload.status || "active", payload.userId).run();
    await writeAudit(actor.id, "user.update", "user", payload.userId, payload);
    return Response.json({ ok: true });
  } catch (error) { return apiFailure(error); }
}
