import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/** Turns draft mode back off; the banner in the layout links here. */
export async function GET() {
  const draft = await draftMode();
  draft.disable();
  redirect("/");
}
