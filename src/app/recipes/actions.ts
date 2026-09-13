"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createRecipeRecord,
  registerIngredientsInLibrary,
  validateRecipeInput,
} from "@/lib/recipes";
import { listLibraryItems } from "@/lib/ingredientLibrary";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function recipeDataFromForm(formData: FormData) {
  let ingredients: unknown = [];
  const raw = formData.get("ingredientsJson");
  if (typeof raw === "string") {
    try {
      ingredients = JSON.parse(raw);
    } catch {
      ingredients = [];
    }
  }
  return validateRecipeInput({
    title: formData.get("title"),
    ingredients,
    sourceUrl: formData.get("sourceUrl"),
    servings: formData.get("servings"),
    prepTimeMinutes: formData.get("prepTimeMinutes"),
    cookTimeMinutes: formData.get("cookTimeMinutes"),
    skillTags: formData.get("skillTags"),
    cuisineTags: formData.get("cuisineTags"),
    steps: formData.get("steps"),
  });
}

export async function getIngredientLibrary() {
  return listLibraryItems();
}

export async function createRecipe(formData: FormData) {
  const data = recipeDataFromForm(formData);
  const recipe = await createRecipeRecord(data);

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
