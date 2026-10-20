import { timingSafeEqual } from "node:crypto";
import { getCache } from "@vercel/functions";
import { ipoConfig } from "@/lib/config";
import { IpoGuruProvider } from "@/lib/providers/ipoguru-provider";
import { refreshIpoGuruSnapshot } from "@/lib/providers/ipoguru-snapshot";

export const dynamic = "force-dynamic";
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (ipoConfig().provider !== "ipoguru") {
    return Response.json({ status: "skipped", reason: "IPO Guru is not the configured provider" }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await refreshIpoGuruSnapshot(
      getCache(),
      () => new IpoGuruProvider().fetchUpcomingIpos({ forceRefresh: true }),
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[ipo-cron] IPO Guru daily refresh failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "IPO data refresh failed" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
