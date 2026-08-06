import { getChatGPTUser } from "../app/chatgpt-auth";
import { headers } from "next/headers";
import { getUserById, initializeAndGetUser } from "./server-data";

export async function currentApiUser(permission?: string) {
  const auth = await getChatGPTUser();
  if (!auth) throw new ApiError(401, "UNAUTHENTICATED", "请先登录");
  try {
    const authenticated = await initializeAndGetUser(auth);
    const requestedUserId = (await headers()).get("x-modelflow-user-id");
    const user = requestedUserId ? await getUserById(requestedUserId) : authenticated;
    if (permission && !user.permissions.includes(permission)) throw new Error("FORBIDDEN");
    return user;
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") throw new ApiError(403, "FORBIDDEN", "没有执行此操作的权限");
    if (error instanceof Error && error.message === "ACCOUNT_DISABLED") throw new ApiError(403, "ACCOUNT_DISABLED", "账号已停用");
    throw error;
  }
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function apiFailure(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  const message = error instanceof Error ? error.message : "服务器内部错误";
  if (message.includes("UNIQUE constraint failed")) return Response.json({ error: "编号或版本号已存在", code: "DUPLICATE" }, { status: 409 });
  console.error(error);
  return Response.json({ error: "服务器内部错误", code: "INTERNAL_ERROR" }, { status: 500 });
}
