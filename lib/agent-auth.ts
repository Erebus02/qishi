import { ApiError } from "./api-auth";
import { getRawDb } from "./server-data";

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function requireAgent(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new ApiError(401, "AGENT_UNAUTHENTICATED", "执行端令牌缺失");
  const tokenHash = await sha256(token);
  const agent = await getRawDb().prepare("SELECT id,name,machine_name,status FROM agents WHERE token_hash=?").bind(tokenHash).first<Record<string, string>>();
  if (!agent) throw new ApiError(401, "AGENT_UNAUTHENTICATED", "执行端令牌无效");
  await getRawDb().prepare("UPDATE agents SET status='online',last_seen_at=CURRENT_TIMESTAMP WHERE id=?").bind(agent.id).run();
  return agent;
}

export function createAgentToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `swagt_${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
