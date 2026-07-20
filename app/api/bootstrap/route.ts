import { apiFailure, currentApiUser } from "../../../lib/api-auth";
import { loadBootstrap } from "../../../lib/server-data";

export async function GET() {
  try {
    const user = await currentApiUser("device.read");
    return Response.json(await loadBootstrap(user));
  } catch (error) { return apiFailure(error); }
}
