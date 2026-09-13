import { prisma } from "@/lib/prisma";

export type IngredientInput = {
  name: string;
  quantity?: string;
  unit?: string;
  prepNote?: string;
};

export type RecipeInput = {
  title: string;
  ingredients: IngredientInput[];
  sourceUrl: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  skillTags: string | null;
  cuisineTags: string | null;
  steps: string | null;
};

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// Accepts either a comma-separated string ("grill-friendly, one-pan") — how
// the web form submits tags — or an array of strings (friendlier for a JSON
// API caller), and normalizes both to the comma-separated string the
// Recipe.skillTags/cuisineTags columns store (see docs/spec.md §3).
function tagsOrNull(v: unknown): string | null {
  if (Array.isArray(v)) {
    const joined = v.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim())
      .join(", ");
    return joined || null;
  }
  return strOrNull(v);
}

function parseIngredientsInput(v: unknown): IngredientInput[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (i): i is Record<string, unknown> =>
        !!i && typeof i === "object" && typeof (i as Record<string, unknown>).name === "string" &&
        ((i as Record<string, unknown>).name as string).trim().length > 0
    )
    .map((i) => ({
      name: (i.name as string).trim(),
      quantity: strOrNull(i.quantity) ?? undefined,
      unit: strOrNull(i.unit) ?? undefined,
      prepNote: strOrNull(i.prepNote) ?? undefined,
    }));
}

/**
 * Shared validation for both the web form (`recipes/actions.ts`) and the
 * JSON API (`app/api/recipes/route.ts`) — keeps the "title + at least one
 * named ingredient" rule (docs/spec.md §5) defined in exactly one place.
 */
export function validateRecipeInput(input: Record<string, unknown>): RecipeInput {
  const title = strOrNull(input.title);
  const ingredients = parseIngredientsInput(input.ingredients);

  if (!title || ingredients.length === 0) {
    throw new Error("Title and at least one ingredient (with a name) are required.");
  }

  return {
    title,
    ingredients,
    sourceUrl: strOrNull(input.sourceUrl),
    servings: intOrNull(input.servings),
    prepTimeMinutes: intOrNull(input.prepTimeMinutes),
    cookTimeMinutes: intOrNull(input.cookTimeMinutes),
    skillTags: tagsOrNull(input.skillTags),
    cuisineTags: tagsOrNull(input.cuisineTags),
    steps: strOrNull(input.steps),
  };
}

export async function registerIngredientsInLibrary(ingredients: IngredientInput[]) {
  for (const ing of ingredients) {
    await prisma.ingredientLibraryItem.upsert({
      where: { name: ing.name },
      update: {},
      create: { name: ing.name, defaultUnit: ing.unit ?? null },
    });
  }
}

export async function createRecipeRecord(data: RecipeInput) {
  const { ingredients, ...rest } = data;
  const recipe = await prisma.recipe.create({
    data: {
      ...rest,
      ingredients: {
        create: ingredients.map((ing, index) => ({ ...ing, position: index })),
      },
    },
  });
  await registerIngredientsInLibrary(ingredients);
  return recipe;
}
