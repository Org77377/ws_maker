import { NextRequest, NextResponse } from "next/server";
import { resolveHeaderImageDataUrl } from "@/lib/pdf/header-image";

// Returns the resolved (fetched + bottom-line-trimmed) header image as a PNG.
// Used by the live preview iframe, which cannot hotlink Google Drive images
// directly due to browser authentication/referrer restrictions.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const source = url.searchParams.get("url") || "";

  const dataUrl = await resolveHeaderImageDataUrl(source || undefined);
  if (!dataUrl) {
    return NextResponse.json(
      { error: "Could not load header image." },
      { status: 502 },
    );
  }

  // dataUrl is `data:image/png;base64,<...>`
  const base64 = dataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
