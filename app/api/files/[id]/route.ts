import { env } from "cloudflare:workers";
import { apiFailure, ApiError, currentApiUser } from "../../../../lib/api-auth";
import { getRawDb, writeAudit } from "../../../../lib/server-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentApiUser("file.download");
    const { id } = await context.params;
    const file = await getRawDb().prepare("SELECT file_name,object_key,content_type FROM files WHERE id=?").bind(id).first<Record<string, string>>();
    if (!file) throw new ApiError(404, "FILE_NOT_FOUND", "文件不存在");
    const object = await env.BUCKET.get(file.object_key);
    if (!object) throw new ApiError(404, "FILE_NOT_FOUND", "文件内容不存在");
    await writeAudit(user.id, "file.download", "file", id, { fileName: file.file_name });
    return new Response(object.body, { headers: { "content-type": file.content_type, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}` } });
  } catch (error) { return apiFailure(error); }
}
