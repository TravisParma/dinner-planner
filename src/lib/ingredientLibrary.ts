import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function listLibraryItems() {
  return prisma.ingredientLibraryItem.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, defaultUnit: true },
  });
}

export async function createLibraryItemRecord(name: string, defaultUnit: string | null) {
  try {
    return await prisma.ingredientLibraryItem.create({ data: { name, defaultUnit } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`"${name}" is already in the library.`);
    }
    throw err;
  }
}
