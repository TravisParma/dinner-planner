import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { updateRecipeRecord, validateRecipePatchInput } from "@/lib/recipes";

// Protected by the app-wide Basic Auth gate in src/middleware.ts — same
// credentials as the web UI, no separate API auth. See docs/spec.md §4.

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/recipes/[id]">) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  let patch;
  try {
    patch = validateRecipePatchInput(body as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const recipe = await updateRecipeRecord(id, patch);
    return NextResponse.json({ recipe });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }
    throw err;
  }
}
