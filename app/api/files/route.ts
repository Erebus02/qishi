import { env } from "cloudflare:workers";
import { apiFailure, ApiError, currentApiUser } from "../../../lib/api-auth";
import { getRawDb, newId, writeAudit } from "../../../lib/server-data";

export async function PUT(request: Request) {
  try {
    const user = await currentApiUser("file.upload");
    if (!env.BUCKET) throw new Error("Object storage binding is unavailable");
    const url = new URL(request.url);
    const fileName = request.headers.get("x-file-name") || url.searchParams.get("filename") || "upload.bin";
    const deviceId = request.headers.get("x-device-id") || url.searchParams.get("deviceId");
    const versionId = request.headers.get("x-version-id") || url.searchParams.get("versionId");
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 500 * 1024 * 1024) throw new ApiError(413, "FILE_TOO_LARGE", "单个文件不能超过 500 MB");
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `uploads/${deviceId || "unassigned"}/${crypto.randomUUID()}-${safeName}`;
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    await env.BUCKET.put(objectKey, request.body, { httpMetadata: { contentType } });
    const object = await env.BUCKET.head(objectKey);
    const fileId = newId("file");
    await getRawDb().prepare(`INSERT INTO files (id,device_id,version_id,file_name,object_key,content_type,size_bytes,role,created_by)
      VALUES (?,?,?,?,?,?,?,'source',?)`).bind(fileId, deviceId || null, versionId || null, fileName, objectKey, contentType, object?.size || contentLength, user.id).run();
    await writeAudit(user.id, "file.upload", "file", fileId, { fileName, deviceId, versionId, size: object?.size || contentLength });
    return Response.json({ id: fileId, fileName, sizeBytes: object?.size || contentLength }, { status: 201 });
  } catch (error) { return apiFailure(error); }
}
