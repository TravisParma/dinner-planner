"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setGeneratedItemChecked(
  rangeStart: string,
  rangeEnd: string,
  itemKey: string,
  name: string,
  unit: string,
  quantity: string,
  checked: boolean
) {
  await prisma.groceryListItem.upsert({
    where: { rangeStart_rangeEnd_itemKey: { rangeStart, rangeEnd, itemKey } },
    update: { checked },
    create: { rangeStart, rangeEnd, itemKey, name, unit, quantity, checked },
  });
  revalidatePath("/grocery-list");
}

export async function removeGeneratedItem(
  rangeStart: string,
  rangeEnd: string,
  itemKey: string,
  name: string,
  unit: string,
  quantity: string
) {
  await prisma.groceryListItem.upsert({
    where: { rangeStart_rangeEnd_itemKey: { rangeStart, rangeEnd, itemKey } },
    update: { removed: true },
    create: { rangeStart, rangeEnd, itemKey, name, unit, quantity, removed: true },
  });
  revalidatePath("/grocery-list");
}

export async function addManualItem(rangeStart: string, rangeEnd: string, formData: FormData) {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) return;
  const quantity = formData.get("quantity");
  const unit = formData.get("unit");

  await prisma.groceryListItem.create({
    data: {
      rangeStart,
      rangeEnd,
      itemKey: null,
      name: name.trim(),
      quantity: typeof quantity === "string" && quantity.trim() ? quantity.trim() : null,
      unit: typeof unit === "string" && unit.trim() ? unit.trim() : null,
    },
  });
  revalidatePath("/grocery-list");
}

export async function setManualItemChecked(id: string, checked: boolean) {
  await prisma.groceryListItem.update({ where: { id }, data: { checked } });
  revalidatePath("/grocery-list");
}

export async function deleteManualItem(id: string) {
  await prisma.groceryListItem.delete({ where: { id } });
  revalidatePath("/grocery-list");
}
