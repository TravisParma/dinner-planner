import { prisma } from "@/lib/prisma";
import { getIngredientLibrary } from "../recipes/actions";
import { createLibraryItem, deleteLibraryItem, renameLibraryItem } from "./actions";
import IngredientRow from "./IngredientRow";
import { INGREDIENT_TABLE_GRID } from "./grid";
import { Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SubmitButton from "@/components/SubmitButton";

// No dynamic route segment or searchParams here, so Next would otherwise try
// to statically prerender this page at build time — including the DB read
// below, which fails in Docker builds (no DATABASE_URL / real DB yet) and
// would serve stale library data anyway. See docs/spec.md §7.
export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const [items, grouped] = await Promise.all([
    getIngredientLibrary(),
    prisma.ingredient.groupBy({ by: ["name"], _count: { _all: true } }),
  ]);

  const countByName = new Map(grouped.map((g) => [g.name, g._count._all]));

  const unusedCount = items.filter((i) => (countByName.get(i.name) ?? 0) === 0).length;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 md:gap-6">
      <PageHeader
        title="Ingredient library"
        subtitle={`${items.length} ingredients · ${unusedCount} not used in any recipe`}
      />

      <form
        action={createLibraryItem}
        className="flex items-center gap-1.5 rounded-full border border-divider bg-surface p-1.5 pl-4 shadow-sm focus-within:border-accent"
      >
        <Plus strokeWidth={2.75} size={16} className="shrink-0 opacity-50" />
        <input
          id="new-name"
          name="name"
          required
          placeholder="New ingredient"
          aria-label="Name"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:opacity-50"
        />
        <input
          id="new-unit"
          name="defaultUnit"
          placeholder="Unit"
          aria-label="Default unit"
          autoComplete="off"
          className="w-16 min-w-0 rounded-full bg-bg px-2 py-2 text-center text-sm outline-none sm:w-28"
        />
        <SubmitButton pendingLabel={null} className="o-pill o-primary shrink-0 px-4">
          Add
        </SubmitButton>
      </form>

      <div className="o-card flex flex-col py-2">
        <div
          className="o-rule hidden gap-2 pb-2 pt-1 text-[11px] uppercase tracking-wide opacity-55 md:grid"
          style={{ gridTemplateColumns: INGREDIENT_TABLE_GRID }}
        >
          <span>Name</span>
          <span>Default unit</span>
          <span>Used in</span>
          <span></span>
        </div>
        {items.map((item) => (
          <IngredientRow
            key={item.id}
            item={item}
            count={countByName.get(item.name) ?? 0}
            renameAction={renameLibraryItem.bind(null, item.id)}
            deleteAction={deleteLibraryItem.bind(null, item.id)}
          />
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm opacity-60">
            No ingredients yet — they&apos;re added automatically as you save recipes.
          </p>
        )}
      </div>
    </div>
  );
}
