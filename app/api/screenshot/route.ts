import { captureScreenshotToBase64 } from "@/lib/tool-runners/screenshot";

export const runtime = "nodejs";

export async function POST() {
  try {
    const shot = await captureScreenshotToBase64();
    return Response.json(shot);
  } catch (e) {
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Screenshot failed",
      },
      { status: 500 },
    );
  }
}
