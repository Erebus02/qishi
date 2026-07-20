import { apiFailure, ApiError, currentApiUser } from "../../../lib/api-auth";
import { getRawDb, newId, writeAudit } from "../../../lib/server-data";

export async function GET() {
  try {
    await currentApiUser("change.read");
    const rows = await getRawDb().prepare(`SELECT co.id,co.order_no,co.batch_no,co.title,co.reason,co.description,co.priority,co.planned_at,
      co.status,co.submitted_at,co.reviewed_at,co.review_comment,co.created_at,u.display_name applicant_name,ru.display_name reviewer_name,
      COUNT(cod.id) device_count,GROUP_CONCAT(cod.device_name_snapshot || ' ' || cod.version_no_snapshot, '、') devices
      FROM change_orders co JOIN users u ON u.id=co.applicant_user_id
      LEFT JOIN users ru ON ru.id=co.reviewer_user_id LEFT JOIN change_order_devices cod ON cod.change_order_id=co.id
      GROUP BY co.id ORDER BY co.created_at DESC LIMIT 100`).all();
    return Response.json({ changeOrders: rows.results });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await currentApiUser("change.create");
    const payload = await request.json() as {
      deviceIds?: string[]; batchNo?: string; title?: string; reason?: string; description?: string;
      priority?: string; plannedAt?: string; submit?: boolean;
    };
    if (!payload.deviceIds?.length) throw new ApiError(400, "DEVICE_REQUIRED", "请至少选择一台设备");
    if (!payload.batchNo?.trim() || !payload.title?.trim() || !payload.reason?.trim()) throw new ApiError(400, "CHANGE_FIELDS_REQUIRED", "请填写变更批次、标题和原因");
    if (payload.submit && !user.permissions.includes("change.submit")) throw new ApiError(403, "FORBIDDEN", "没有提交变更申请的权限");

    const changeOrderId = newId("eco");
    const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    const orderNo = `ECO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${suffix}`;
    const status = payload.submit ? "submitted" : "draft";
    await getRawDb().prepare(`INSERT INTO change_orders (id,order_no,batch_no,title,reason,description,priority,planned_at,status,applicant_user_id,submitted_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,CASE WHEN ?='submitted' THEN CURRENT_TIMESTAMP ELSE NULL END)`)
      .bind(changeOrderId, orderNo, payload.batchNo.trim(), payload.title.trim(), payload.reason.trim(), payload.description?.trim() || "", payload.priority || "normal", payload.plannedAt || null, status, user.id, status).run();

    for (const deviceId of [...new Set(payload.deviceIds)]) {
      const device = await getRawDb().prepare(`SELECT d.id,d.code,d.name,d.current_version_id,COALESCE(v.version_no,'—') version_no
        FROM devices d LEFT JOIN device_versions v ON v.id=d.current_version_id WHERE d.id=? AND d.deleted_at IS NULL`).bind(deviceId).first<Record<string, string | null>>();
      if (!device) throw new ApiError(400, "DEVICE_NOT_FOUND", `设备 ${deviceId} 不存在`);
      await getRawDb().prepare(`INSERT INTO change_order_devices (id,change_order_id,device_id,version_id,device_code_snapshot,device_name_snapshot,version_no_snapshot)
        VALUES (?,?,?,?,?,?,?)`).bind(newId("eco_dev"), changeOrderId, device.id, device.current_version_id, device.code, device.name, device.version_no).run();
    }
    await writeAudit(user.id, payload.submit ? "change.submit" : "change.create", "change_order", changeOrderId, { orderNo, ...payload });
    return Response.json({ id: changeOrderId, orderNo, status }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
