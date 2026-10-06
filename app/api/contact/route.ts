import { handleContact, type ContactPayload } from "@/lib/contact";

/**
 * The contact-letter endpoint: a thin Next.js route handler over lib/contact.ts (ported unchanged from the CloudBook project's
 * `api/_contact.ts`). All the work, validation, rate limiting and the Resend relay, lives there and has no host dependencies.
 * The API key is read only from this server's environment and never reaches the browser bundle.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  // Behind a proxy the socket address is the proxy's, so the forwarded header is the visitor. First entry only: the rest can be
  // spoofed by the client, and the last is the proxy itself.
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const clientKey = forwarded.split(",")[0].trim() || "unknown";

  const result = await handleContact(
    payload,
    { RESEND_API_KEY: process.env.RESEND_API_KEY, CONTACT_EMAIL: process.env.CONTACT_EMAIL, EMAIL_FROM: process.env.EMAIL_FROM },
    clientKey,
  );
  return Response.json(result.body, { status: result.status });
}

export function GET() {
  return Response.json({ ok: false, error: "Method not allowed." }, { status: 405 });
}
