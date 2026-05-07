import { NextResponse } from "next/server";
import { clearMemory, deleteMemory, getMemory } from "@/lib/memory";

export async function GET() {
  const memories = await getMemory();
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  let body: { deleteId?: string; clearAll?: boolean };
  try {
    body = (await request.json()) as { deleteId?: string; clearAll?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.clearAll) {
    await clearMemory();
    return NextResponse.json({ ok: true });
  }

  if (body.deleteId) {
    await deleteMemory(body.deleteId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Provide deleteId or clearAll: true" },
    { status: 400 },
  );
}
