import { NextResponse } from "next/server";
import { clearMemory, deleteMemory, getMemory, mergeImportedMemoryEntries } from "@/lib/memory";
import type { MemoryEntry } from "@/lib/types";

export async function GET() {
  const memories = await getMemory();
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  let body: {
    deleteId?: string;
    clearAll?: boolean;
    mergeImport?: MemoryEntry[];
  };
  try {
    body = (await request.json()) as {
      deleteId?: string;
      clearAll?: boolean;
      mergeImport?: MemoryEntry[];
    };
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

  if (Array.isArray(body.mergeImport) && body.mergeImport.length > 0) {
    const memories = await mergeImportedMemoryEntries(body.mergeImport);
    return NextResponse.json({ ok: true, memories });
  }

  return NextResponse.json(
    {
      error:
        "Provide deleteId, clearAll: true, or mergeImport: [ { id, fact, createdAt }, ... ]",
    },
    { status: 400 },
  );
}
