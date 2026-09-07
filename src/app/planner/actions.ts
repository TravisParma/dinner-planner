"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function toMidnightUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function setPlannedMeal(dateStr: string, formData: FormData) {
  const recipeId = formData.get("recipeId");
  if (typeof recipeId !== "string" || !recipeId) return;

  const date = toMidnightUTC(dateStr);
  await prisma.plannedMeal.upsert({
    where: { date },
    update: { recipeId },
    create: { date, recipeId },
  });
  revalidatePath("/planner");
}

export async function clearPlannedMeal(dateStr: string) {
  const date = toMidnightUTC(dateStr);
  await prisma.plannedMeal.deleteMany({ where: { date } });
  revalidatePath("/planner");
}
