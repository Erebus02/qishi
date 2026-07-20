import { apiFailure, ApiError, currentApiUser } from "../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../lib/server-data";

export async function GET() {
  try {
    await currentApiUser("role.manage");
    const roles = await getRawDb().prepare(`SELECT r.id,r.name,r.code,r.permissions,r.data_scope,COUNT(u.id) user_count
      FROM roles r LEFT JOIN users u ON u.role_id=r.id GROUP BY r.id ORDER BY r.created_at`).all();
    return Response.json({ roles: roles.results });
  } catch (error) { return apiFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentApiUser("role.manage");
    const payload = await request.json() as { id?: string; permissions?: string[]; dataScope?: string };
    if (!payload.id || !Array.isArray(payload.permissions)) throw new ApiError(400, "INVALID_ROLE", "角色配置无效");
    await getRawDb().prepare("UPDATE roles SET permissions=?,data_scope=? WHERE id=? AND code<>'admin'")
      .bind(JSON.stringify(payload.permissions), payload.dataScope || "own", payload.id).run();
    await writeAudit(user.id, "role.update", "role", payload.id, payload);
    return Response.json({ ok: true });
  } catch (error) { return apiFailure(error); }
}
