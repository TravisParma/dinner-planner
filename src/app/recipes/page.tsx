import Link from "next/link";
import { ChefHat, Clock, Plus, Repeat, Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";

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

// Stable warm tint per recipe title, used for the card's monogram tile.
const MONOGRAM_TINTS = [
  ["var(--color-accent-200)", "var(--color-accent-800)"],
  ["var(--color-accent-2-200)", "var(--color-accent-2-800)"],
  ["var(--color-accent-300)", "var(--color-accent-900)"],
  ["var(--color-accent-2-300)", "var(--color-accent-2-900)"],
  ["var(--color-neutral-300)", "var(--color-neutral-900)"],
];

function monogramStyle(title: string): React.CSSProperties {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = MONOGRAM_TINTS[hash % MONOGRAM_TINTS.length];
  return { background: bg, color: fg };
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
  const hasFilters = Boolean(keyword || skillFilter || cuisineFilter);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <PageHeader
        title="Recipes"
        subtitle={`${recipes.length} saved · ${ratedCount} rated · ${taggedCount} tagged`}
        actions={
          <Link href="/recipes/new" className="o-pill o-primary hidden px-5 py-2.5 md:inline-flex">
            <Plus strokeWidth={2.75} size={15} />
            Add recipe
          </Link>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form method="get" className="flex-1" role="search">
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
              type="search"
              defaultValue={q ?? ""}
              placeholder="Search titles or ingredients"
              aria-label="Search recipes"
              className="o-input w-full pl-10"
            />
          </div>
        </form>

        <div className="o-scroll-x -mx-4 px-4 md:mx-0 md:px-0">
          <div
            role="group"
            aria-label="Sort by"
            className="flex w-max overflow-hidden rounded-full border border-divider"
          >
            {SORT_OPTIONS.map((opt, i) => (
              <Link
                key={opt.key}
                href={buildHref(params, { sort: opt.key === "title" ? undefined : opt.key })}
                aria-current={sortKey === opt.key ? "true" : undefined}
                className={`whitespace-nowrap px-4 py-2 text-sm transition-colors ${
                  sortKey === opt.key ? "bg-accent font-semibold text-on-accent" : "hover:bg-surface"
                } ${i > 0 ? "border-l border-divider" : ""}`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {(skillTags.length > 0 || cuisineTags.length > 0) && (
        <div className="o-scroll-x -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex w-max items-center gap-2 md:w-auto md:flex-wrap">
            {skillTags.map((tag) => (
              <Link
                key={`skill-${tag}`}
                href={buildHref(params, { skill: skillFilter === tag.toLowerCase() ? undefined : tag })}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  skillFilter === tag.toLowerCase()
                    ? "bg-accent-2-200 font-semibold text-accent-2-800"
                    : "border border-divider hover:bg-surface"
                }`}
              >
                {tag}
              </Link>
            ))}
            {skillTags.length > 0 && cuisineTags.length > 0 && (
              <span className="h-[18px] w-px shrink-0 bg-divider" />
            )}
            {cuisineTags.map((tag) => (
              <Link
                key={`cuisine-${tag}`}
                href={buildHref(params, { cuisine: cuisineFilter === tag.toLowerCase() ? undefined : tag })}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  cuisineFilter === tag.toLowerCase()
                    ? "bg-accent-200 font-semibold text-accent-800"
                    : "border border-divider hover:bg-surface"
                }`}
              >
                {tag}
              </Link>
            ))}
            {hasFilters && (
              <Link
                href={buildHref({ sort: params.sort }, {})}
                className="flex items-center gap-1 whitespace-nowrap px-2 py-1.5 text-xs text-accent-700 hover:underline"
              >
                <X strokeWidth={2.75} size={12} />
                Clear
              </Link>
            )}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="o-card flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <ChefHat strokeWidth={2.5} size={22} />
          </span>
          {recipes.length === 0 ? (
            <>
              <p className="font-heading text-[18px]">No recipes yet</p>
              <Link href="/recipes/new" className="o-pill o-primary">
                <Plus strokeWidth={2.75} size={15} />
                Add your first one
              </Link>
            </>
          ) : (
            <>
              <p className="font-heading text-[18px]">Nothing matches</p>
              <p className="text-sm opacity-60">Try a different search or clear the filters.</p>
              <Link href={buildHref({ sort: params.sort }, {})} className="o-pill o-quiet">
                Clear filters
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((recipe) => {
            const skillList = parseTags(recipe.skillTags);
            const cuisineList = parseTags(recipe.cuisineTags);
            const totalMinutes =
              recipe.prepTimeMinutes != null || recipe.cookTimeMinutes != null
                ? (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
                : null;
            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="o-card o-card-link flex gap-3.5"
              >
                <span
                  aria-hidden
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] font-heading text-[24px]"
                  style={monogramStyle(recipe.title)}
                >
                  {recipe.title.trim().charAt(0).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading text-[17px] leading-[1.2]">{recipe.title}</span>
                    {recipe.makeAgain && (
                      <span
                        className="o-tag shrink-0 gap-1 bg-accent-2-200 text-accent-2-800"
                        title="Make again"
                      >
                        <Repeat strokeWidth={2.75} size={11} />
                      </span>
                    )}
                  </div>
                  {recipe.rating ? (
                    <span
                      className="text-[13px] tracking-wider text-accent"
                      aria-label={`${recipe.rating} of 5 stars`}
                    >
                      {"★".repeat(recipe.rating)}
                      <span className="opacity-30">{"★".repeat(5 - recipe.rating)}</span>
                    </span>
                  ) : (
                    <span className="text-[12px] opacity-50">Not rated</span>
                  )}
                  {(skillList.length > 0 || cuisineList.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {skillList.map((tag) => (
                        <span key={`skill-${tag}`} className="o-tag bg-accent-2-100 text-accent-2-800">
                          {tag}
                        </span>
                      ))}
                      {cuisineList.map((tag) => (
                        <span key={`cuisine-${tag}`} className="o-tag bg-accent-100 text-accent-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11.5px] opacity-60">
                    <span>
                      {recipe.ingredients.length}{" "}
                      {recipe.ingredients.length === 1 ? "ingredient" : "ingredients"}
                    </span>
                    {totalMinutes != null && (
                      <span className="flex items-center gap-1">
                        <Clock strokeWidth={2.5} size={11} />
                        {totalMinutes} min
                      </span>
                    )}
                    {recipe.lastMadeAt && (
                      <span>
                        Made{" "}
                        {recipe.lastMadeAt.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Phone-only floating "add" button, parked above the bottom tab bar. */}
      <Link
        href="/recipes/new"
        aria-label="Add recipe"
        className="o-primary fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:hidden"
        style={{ bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 16px)" }}
      >
        <Plus strokeWidth={2.75} size={24} />
      </Link>
    </div>
  );
}
