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

export type RecipePatch = Partial<RecipeInput>;

/**
 * Validates a partial update body (JSON API `PATCH /api/recipes/[id]` — see
 * docs/spec.md §4). Unlike `validateRecipeInput`, only keys actually present
 * in `input` are validated/returned — this lets a caller update e.g. just
 * `steps` without resending the full recipe. `title` and `ingredients`, if
 * present, still can't be emptied (a recipe always needs both per §5).
 */
export function validateRecipePatchInput(input: Record<string, unknown>): RecipePatch {
  if (Object.keys(input).length === 0) {
    throw new Error("Request body must include at least one field to update.");
  }

  const patch: RecipePatch = {};

  if ("title" in input) {
    const title = strOrNull(input.title);
    if (!title) throw new Error("title cannot be empty.");
    patch.title = title;
  }
  if ("ingredients" in input) {
    const ingredients = parseIngredientsInput(input.ingredients);
    if (ingredients.length === 0) {
      throw new Error("ingredients must include at least one entry with a name.");
    }
    patch.ingredients = ingredients;
  }
  if ("sourceUrl" in input) patch.sourceUrl = strOrNull(input.sourceUrl);
  if ("servings" in input) patch.servings = intOrNull(input.servings);
  if ("prepTimeMinutes" in input) patch.prepTimeMinutes = intOrNull(input.prepTimeMinutes);
  if ("cookTimeMinutes" in input) patch.cookTimeMinutes = intOrNull(input.cookTimeMinutes);
  if ("skillTags" in input) patch.skillTags = tagsOrNull(input.skillTags);
  if ("cuisineTags" in input) patch.cuisineTags = tagsOrNull(input.cuisineTags);
  if ("steps" in input) patch.steps = strOrNull(input.steps);

  return patch;
}

export async function updateRecipeRecord(id: string, patch: RecipePatch) {
  const { ingredients, ...rest } = patch;

  if (ingredients) {
    await prisma.ingredient.deleteMany({ where: { recipeId: id } });
  }
  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      ...rest,
      ...(ingredients
        ? { ingredients: { create: ingredients.map((ing, index) => ({ ...ing, position: index })) } }
        : {}),
    },
  });
  if (ingredients) {
    await registerIngredientsInLibrary(ingredients);
  }
  return recipe;
}
