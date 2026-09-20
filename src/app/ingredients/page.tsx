import { prisma } from "@/lib/prisma";
import { getIngredientLibrary } from "../recipes/actions";
import { createLibraryItem, deleteLibraryItem, renameLibraryItem } from "./actions";
import IngredientRow from "./IngredientRow";

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

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <div>
        <h1 className="text-[32px]">Ingredient Library</h1>
        <p className="text-[13px] opacity-60">
          Names and default units reused when you write a recipe.
        </p>
      </div>

      <form action={createLibraryItem} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 min-w-[200px] flex-col gap-1">
          <label htmlFor="new-name" className="text-sm font-medium">
            Name
          </label>
          <input id="new-name" name="name" required className="o-input w-full" />
        </div>
        <div className="flex flex-col gap-1" style={{ width: "140px" }}>
          <label htmlFor="new-unit" className="text-sm font-medium">
            Default unit
          </label>
          <input id="new-unit" name="defaultUnit" className="o-input w-full" />
        </div>
        <button type="submit" className="o-pill bg-accent text-bg">
          Add
        </button>
      </form>

      <div className="o-card flex flex-col">
        <div
          className="o-rule grid gap-2 pb-2 text-[11px] uppercase tracking-wide opacity-55"
          style={{ gridTemplateColumns: "minmax(0,1fr) 140px 150px" }}
        >
          <span>Name</span>
          <span>Default unit</span>
          <span>Used in</span>
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
          <p className="py-3 text-sm opacity-60">No ingredients in the library yet.</p>
        )}
      </div>
    </div>
  );
}
