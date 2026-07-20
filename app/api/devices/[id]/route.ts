import { apiFailure, ApiError, currentApiUser } from "../../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../../lib/server-data";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentApiUser("device.update");
    const { id } = await context.params;
    const payload = await request.json() as Record<string, string | number>;
    const existing = await getRawDb().prepare("SELECT id,row_version FROM devices WHERE id=? AND deleted_at IS NULL").bind(id).first<{ id: string; row_version: number }>();
    if (!existing) throw new ApiError(404, "DEVICE_NOT_FOUND", "设备不存在");
    if (payload.rowVersion && Number(payload.rowVersion) !== existing.row_version) throw new ApiError(409, "EDIT_CONFLICT", "设备已被其他用户修改，请刷新后重试");
    const name = typeof payload.name === "string" ? payload.name.trim() : null;
    if (name !== null && !name) throw new ApiError(400, "INVALID_DEVICE_NAME", "设备名称不能为空");
    const result = await getRawDb().prepare(`UPDATE devices SET name=COALESCE(?,name),category=COALESCE(?,category),description=COALESCE(?,description),
      lifecycle_status=COALESCE(?,lifecycle_status),row_version=row_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND row_version=?`)
      .bind(name, payload.category || null, payload.description ?? null, payload.lifecycleStatus || null, id, existing.row_version).run();
    if (!result.meta.changes) throw new ApiError(409, "EDIT_CONFLICT", "设备已被其他用户修改，请刷新后重试");
    await writeAudit(user.id, "device.update", "device", id, payload);
    return Response.json({ ok: true, rowVersion: existing.row_version + 1 });
  } catch (error) { return apiFailure(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentApiUser("device.delete");
    const { id } = await context.params;
    const result = await getRawDb().prepare("UPDATE devices SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(id).run();
    if (!result.meta.changes) throw new ApiError(404, "DEVICE_NOT_FOUND", "设备不存在或已删除");
    await writeAudit(user.id, "device.delete", "device", id, {});
    return new Response(null, { status: 204 });
  } catch (error) { return apiFailure(error); }
}
