import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SortKey = "rating" | "lastMade" | "cuisine" | "title";

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; skill?: string; cuisine?: string; q?: string }>;
}) {
  const { sort, skill, cuisine, q } = await searchParams;
  const sortKey: SortKey =
    sort === "rating" || sort === "lastMade" || sort === "cuisine" ? sort : "title";

  const recipes = await prisma.recipe.findMany({
    include: { ingredients: true },
  });

  const keyword = q?.trim().toLowerCase();
  const skillFilter = skill?.trim().toLowerCase();
  const cuisineFilter = cuisine?.trim().toLowerCase();

  const filtered = recipes.filter((r) => {
    if (
      keyword &&
      !r.title.toLowerCase().includes(keyword) &&
      !r.ingredients.some((i) => i.name.toLowerCase().includes(keyword))
    ) {
      return false;
    }
    if (
      skillFilter &&
      !parseTags(r.skillTags).some((t) => t.toLowerCase().includes(skillFilter))
    ) {
      return false;
    }
    if (
      cuisineFilter &&
      !parseTags(r.cuisineTags).some((t) => t.toLowerCase().includes(cuisineFilter))
    ) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "lastMade":
        return (b.lastMadeAt?.getTime() ?? 0) - (a.lastMadeAt?.getTime() ?? 0);
      case "cuisine":
        return (a.cuisineTags ?? "").localeCompare(b.cuisineTags ?? "");
      default:
        return a.title.localeCompare(b.title);
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipe Library</h1>
        <div className="flex gap-2">
          <Link
            href="/recipes/new"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Add Recipe
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="font-medium">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Title or ingredient"
            className="rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cuisine" className="font-medium">
            Filter by cuisine/diet tag
          </label>
          <input
            id="cuisine"
            name="cuisine"
            defaultValue={cuisine ?? ""}
            placeholder="mexican"
            className="rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sort" className="font-medium">
            Sort by
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sortKey}
            className="rounded border border-zinc-300 px-2 py-1"
          >
            <option value="title">Title</option>
            <option value="rating">Rating</option>
            <option value="lastMade">Last made</option>
            <option value="cuisine">Cuisine</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="skill" className="font-medium">
            Filter by skill tag
          </label>
          <input
            id="skill"
            name="skill"
            defaultValue={skill ?? ""}
            placeholder="grill-friendly"
            className="rounded border border-zinc-300 px-2 py-1"
          />
        </div>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100"
        >
          Apply
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-zinc-500">
          {recipes.length === 0 ? (
            <>
              No recipes yet.{" "}
              <Link href="/recipes/new" className="text-blue-600 hover:underline">
                Add your first one.
              </Link>
            </>
          ) : (
            "No recipes match your search/filters."
          )}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
          {sorted.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{recipe.title}</span>
                  {recipe.rating ? (
                    <span className="text-sm text-amber-500">
                      {"★".repeat(recipe.rating)}
                      {"☆".repeat(5 - recipe.rating)}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400">Not rated</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-zinc-500">
                  {parseTags(recipe.skillTags).map((tag) => (
                    <span
                      key={`skill-${tag}`}
                      className="rounded-full bg-zinc-100 px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                  {parseTags(recipe.cuisineTags).map((tag) => (
                    <span
                      key={`cuisine-${tag}`}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                  <span>{recipe.ingredients.length} ingredients</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
