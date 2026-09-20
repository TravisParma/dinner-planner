import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";

type SortKey = "rating" | "lastMade" | "cuisine" | "title";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "rating", label: "Rating" },
  { key: "lastMade", label: "Last made" },
  { key: "cuisine", label: "Cuisine" },
];

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildHref(
  params: { sort?: string; skill?: string; cuisine?: string; q?: string },
  overrides: Record<string, string | undefined>
): string {
  const next = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; skill?: string; cuisine?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { skill, cuisine, q } = params;
  const sortKey: SortKey =
    params.sort === "rating" || params.sort === "lastMade" || params.sort === "cuisine"
      ? params.sort
      : "title";

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
      !parseTags(r.skillTags).some((t) => t.toLowerCase() === skillFilter)
    ) {
      return false;
    }
    if (
      cuisineFilter &&
      !parseTags(r.cuisineTags).some((t) => t.toLowerCase() === cuisineFilter)
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

  const skillTagSet = new Set<string>();
  const cuisineTagSet = new Set<string>();
  for (const r of recipes) {
    parseTags(r.skillTags).forEach((t) => skillTagSet.add(t));
    parseTags(r.cuisineTags).forEach((t) => cuisineTagSet.add(t));
  }
  const skillTags = [...skillTagSet].sort();
  const cuisineTags = [...cuisineTagSet].sort();

  const ratedCount = recipes.filter((r) => r.rating != null).length;
  const taggedCount = recipes.filter((r) => parseTags(r.skillTags).length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px]">Recipes</h1>
          <p className="text-[13px] opacity-60">
            {recipes.length} saved · {ratedCount} rated · {taggedCount} tagged
          </p>
        </div>
        <Link href="/recipes/new" className="o-pill bg-accent text-bg px-5 py-2.5">
          <Plus strokeWidth={2.75} size={15} />
          Add recipe
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form method="get" className="flex-1 min-w-[260px]">
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          {params.skill && <input type="hidden" name="skill" value={params.skill} />}
          {params.cuisine && <input type="hidden" name="cuisine" value={params.cuisine} />}
          <div className="relative">
            <Search
              strokeWidth={2.75}
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
            />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search recipes"
              className="o-input w-full pl-10"
            />
          </div>
        </form>

        <div className="flex overflow-hidden rounded-full border border-divider">
          {SORT_OPTIONS.map((opt, i) => (
            <Link
              key={opt.key}
              href={buildHref(params, { sort: opt.key === "title" ? undefined : opt.key })}
              className={`whitespace-nowrap px-3.5 py-1.5 text-sm ${
                sortKey === opt.key ? "bg-accent text-bg" : ""
              } ${i > 0 ? "border-l border-divider" : ""}`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {(skillTags.length > 0 || cuisineTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {skillTags.map((tag) => (
            <Link
              key={`skill-${tag}`}
              href={buildHref(params, { skill: skillFilter === tag.toLowerCase() ? undefined : tag })}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                skillFilter === tag.toLowerCase()
                  ? "bg-accent-200 text-accent-800"
                  : "border border-divider"
              }`}
            >
              {tag}
            </Link>
          ))}
          {skillTags.length > 0 && cuisineTags.length > 0 && (
            <span className="h-[18px] w-px bg-divider" />
          )}
          {cuisineTags.map((tag) => (
            <Link
              key={`cuisine-${tag}`}
              href={buildHref(params, { cuisine: cuisineFilter === tag.toLowerCase() ? undefined : tag })}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                cuisineFilter === tag.toLowerCase()
                  ? "bg-accent-200 text-accent-800"
                  : "border border-divider"
              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="opacity-60">
          {recipes.length === 0 ? (
            <>
              No recipes yet.{" "}
              <Link href="/recipes/new" className="text-accent-700 hover:underline">
                Add your first one.
              </Link>
            </>
          ) : (
            "No recipes match your search/filters."
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-[13.2px] sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="o-card flex flex-col gap-[8.8px]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading text-[18px] leading-[1.2]">{recipe.title}</span>
                {recipe.rating ? (
                  <span className="whitespace-nowrap text-[13px] text-accent-700">
                    {"★".repeat(recipe.rating)}
                    {"☆".repeat(5 - recipe.rating)}
                  </span>
                ) : (
                  <span className="whitespace-nowrap text-[13px] opacity-50">Not rated</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {parseTags(recipe.skillTags).map((tag) => (
                  <span
                    key={`skill-${tag}`}
                    className="o-tag bg-accent-2-100 text-accent-2-800"
                  >
                    {tag}
                  </span>
                ))}
                {parseTags(recipe.cuisineTags).map((tag) => (
                  <span key={`cuisine-${tag}`} className="o-tag bg-accent-100 text-accent-800">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-[11px] opacity-55">
                {[
                  `${recipe.ingredients.length} ingredients`,
                  recipe.cookTimeMinutes != null ? `${recipe.cookTimeMinutes} min` : null,
                  recipe.lastMadeAt
                    ? `Last made ${recipe.lastMadeAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
