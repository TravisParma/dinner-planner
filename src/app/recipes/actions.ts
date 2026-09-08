"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type IngredientInput = { name: string; quantity?: string; unit?: string; prepNote?: string };

function parseIngredients(raw: FormDataEntryValue | null): IngredientInput[] {
  if (!raw || typeof raw !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (i): i is { name: string; quantity?: string; unit?: string; prepNote?: string } =>
        !!i && typeof i.name === "string" && i.name.trim().length > 0
    )
    .map((i) => ({
      name: i.name.trim(),
      quantity: i.quantity?.trim() || undefined,
      unit: i.unit?.trim() || undefined,
      prepNote: i.prepNote?.trim() || undefined,
    }));
}

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function int(formData: FormData, key: string): number | undefined {
  const v = str(formData, key);
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

function recipeDataFromForm(formData: FormData) {
  const title = str(formData, "title");
  const ingredients = parseIngredients(formData.get("ingredientsJson"));
  if (!title || ingredients.length === 0) {
    throw new Error("Title and at least one ingredient are required.");
  }
  return {
    title,
    ingredients,
    sourceUrl: str(formData, "sourceUrl") ?? null,
    servings: int(formData, "servings") ?? null,
    prepTimeMinutes: int(formData, "prepTimeMinutes") ?? null,
    cookTimeMinutes: int(formData, "cookTimeMinutes") ?? null,
    skillTags: str(formData, "skillTags") ?? null,
    cuisineTags: str(formData, "cuisineTags") ?? null,
    steps: str(formData, "steps") ?? null,
  };
}

async function registerIngredientsInLibrary(ingredients: IngredientInput[]) {
  for (const ing of ingredients) {
    await prisma.ingredientLibraryItem.upsert({
      where: { name: ing.name },
      update: {},
      create: { name: ing.name, defaultUnit: ing.unit ?? null },
    });
  }
}

export async function getIngredientLibrary() {
  return prisma.ingredientLibraryItem.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, defaultUnit: true },
  });
}

export async function createRecipe(formData: FormData) {
  const { ingredients, ...data } = recipeDataFromForm(formData);

  const recipe = await prisma.recipe.create({
    data: {
      ...data,
      ingredients: {
        create: ingredients.map((ing, index) => ({ ...ing, position: index })),
      },
    },
  });
  await registerIngredientsInLibrary(ingredients);

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(id: string, formData: FormData) {
  const { ingredients, ...data } = recipeDataFromForm(formData);

  await prisma.ingredient.deleteMany({ where: { recipeId: id } });
  await prisma.recipe.update({
    where: { id },
    data: {
      ...data,
      ingredients: {
        create: ingredients.map((ing, index) => ({ ...ing, position: index })),
      },
    },
  });
  await registerIngredientsInLibrary(ingredients);

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function rateRecipe(id: string, formData: FormData) {
  const raw = str(formData, "rating");
  const rating = raw ? Number.parseInt(raw, 10) : null;
  await prisma.recipe.update({
    where: { id },
    data: { rating: rating && rating >= 1 && rating <= 5 ? rating : null },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}

export async function toggleMakeAgain(id: string, current: boolean) {
  await prisma.recipe.update({
    where: { id },
    data: { makeAgain: !current },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}

export async function markMadeToday(id: string) {
  await prisma.recipe.update({
    where: { id },
    data: { lastMadeAt: new Date() },
  });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}
