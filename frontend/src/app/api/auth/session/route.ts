import { readAuthCookies } from "@/lib/auth/cookies";
import { noStoreJson } from "@/lib/auth/responses";

export async function GET() {
  const { accessToken, refreshToken } = await readAuthCookies();
  return noStoreJson({
    data: {
      authenticated: Boolean(accessToken || refreshToken),
    },
  });
}
