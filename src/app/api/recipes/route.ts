import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRecipeRecord, validateRecipeInput } from "@/lib/recipes";

// Protected by the app-wide Basic Auth gate in src/middleware.ts — same
// credentials as the web UI, no separate API auth. See docs/spec.md §4.

export async function GET() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, sourceUrl: true, rating: true, createdAt: true },
  });
  return NextResponse.json({ recipes });
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

  let data;
  try {
    data = validateRecipeInput(body as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const recipe = await createRecipeRecord(data);
  return NextResponse.json({ recipe }, { status: 201 });
}
