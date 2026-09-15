import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/**
 * `GET /api/draft?secret=…&redirect=/k/dam` turns draft mode on: from then on every server render sends the
 * preview key instead of the publishable one and sees unpublished content. The preview key itself never leaves
 * the server — only this cookie does — and the shared secret keeps a stranger from turning it on.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.STOREFRONT_DRAFT_SECRET;
  if (!secret || url.searchParams.get("secret") !== secret) {
    return new Response("Invalid draft secret.", { status: 401 });
  }
  if (!process.env.STOREFRONT_PREVIEW_KEY) {
    return new Response("STOREFRONT_PREVIEW_KEY is not configured.", { status: 500 });
  }

  const draft = await draftMode();
  draft.enable();
  // Only a path, never an absolute URL: an open redirect here would hand the draft cookie to somebody else's site.
  const target = url.searchParams.get("redirect") ?? "/";
  redirect(target.startsWith("/") && !target.startsWith("//") ? target : "/");
}
