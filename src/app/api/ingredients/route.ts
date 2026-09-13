import { NextRequest, NextResponse } from "next/server";
import { createLibraryItemRecord, listLibraryItems } from "@/lib/ingredientLibrary";

// Protected by the app-wide Basic Auth gate in src/middleware.ts — same
// credentials as the web UI, no separate API auth. See docs/spec.md §4.

export async function GET() {
  const items = await listLibraryItems();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { name: rawName, defaultUnit: rawDefaultUnit } = body as Record<string, unknown>;
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const defaultUnit = typeof rawDefaultUnit === "string" && rawDefaultUnit.trim() ? rawDefaultUnit.trim() : null;

  try {
    const item = await createLibraryItemRecord(name, defaultUnit);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already in the library")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
