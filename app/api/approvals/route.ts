import { apiFailure, currentApiUser } from "../../../lib/api-auth";
import { getRawDb } from "../../../lib/server-data";

export async function GET() {
  try {
    const user = await currentApiUser("version.read");
    const rows = await getRawDb().prepare(`SELECT v.id,v.device_id,v.version_no,v.title,v.summary,v.status,v.owner_user_id,v.created_at,v.released_at,
      d.code device_code,d.name device_name,d.thumbnail_key image,p.name project_name,ou.display_name owner_name,
      al.action review_action,al.detail review_detail,al.created_at reviewed_at,al.user_id reviewer_id,ru.display_name reviewer_name
      FROM device_versions v JOIN devices d ON d.id=v.device_id JOIN projects p ON p.id=d.project_id
      LEFT JOIN users ou ON ou.id=v.owner_user_id
      LEFT JOIN audit_logs al ON al.id=(SELECT a.id FROM audit_logs a WHERE a.resource_type='device_version' AND a.resource_id=v.id
        AND a.action IN ('version.approve','version.reject') ORDER BY a.created_at DESC LIMIT 1)
      LEFT JOIN users ru ON ru.id=al.user_id
      WHERE d.deleted_at IS NULL ORDER BY COALESCE(al.created_at,v.created_at) DESC`).all<Record<string, string | null>>();
    return Response.json({ currentUserId: user.id, approvals: rows.results ?? [] });
  } catch (error) { return apiFailure(error); }
}
