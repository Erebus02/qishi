import DashboardClient from "./dashboard-client";
import { requireChatGPTUser } from "./chatgpt-auth";
import { initializeAndGetUser, loadBootstrap } from "../lib/server-data";

export default async function HomePage() {
  const authenticated = await requireChatGPTUser("/");
  const user = await initializeAndGetUser(authenticated);
  const initialData = await loadBootstrap(user);
  return <DashboardClient initialData={initialData} />;
}
