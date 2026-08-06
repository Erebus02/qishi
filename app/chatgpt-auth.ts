import { headers } from "next/headers";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const PUBLIC_USER: ChatGPTUser = {
  displayName: "公开管理员",
  email: "public-admin@modelflow.local",
  fullName: "公开管理员",
};

export async function getChatGPTUser(): Promise<ChatGPTUser> {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!email) return PUBLIC_USER;

  const encodedName = requestHeaders.get("oai-authenticated-user-full-name");
  const encoding = requestHeaders.get("oai-authenticated-user-full-name-encoding");
  const fullName = encodedName && encoding === "percent-encoded-utf-8"
    ? safeDecodeURIComponent(encodedName)
    : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(_returnTo: string): Promise<ChatGPTUser> {
  void _returnTo;
  return getChatGPTUser();
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
