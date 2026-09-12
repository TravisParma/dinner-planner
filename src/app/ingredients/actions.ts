"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function createLibraryItem(formData: FormData) {
  const name = str(formData, "name");
  if (!name) {
    throw new Error("Name is required.");
  }
  const defaultUnit = str(formData, "defaultUnit") ?? null;

  try {
    await prisma.ingredientLibraryItem.create({ data: { name, defaultUnit } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`"${name}" is already in the library.`);
    }
    throw err;
  }

  revalidatePath("/ingredients");
  revalidatePath("/recipes");
}

export async function renameLibraryItem(id: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) {
    throw new Error("Name is required.");
  }
  const defaultUnit = str(formData, "defaultUnit") ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.ingredientLibraryItem.findUniqueOrThrow({ where: { id } });
      await tx.ingredientLibraryItem.update({
        where: { id },
        data: { name, defaultUnit },
      });
      if (existing.name !== name) {
        await tx.ingredient.updateMany({
          where: { name: existing.name },
          data: { name },
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`"${name}" is already in the library.`);
    }
    throw err;
  }

  revalidatePath("/ingredients");
  revalidatePath("/recipes");
}

export async function deleteLibraryItem(id: string) {
  await prisma.ingredientLibraryItem.delete({ where: { id } });
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
}
