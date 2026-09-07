# Family Dinner Planner — Technical Spec

> **This is a living document.** It describes what is actually built, not what's planned.
> See [food-planner-product-vision.md](food-planner-product-vision.md) for the product goals and non-goals this implements.
> See the "Keeping this spec updated" section at the bottom for maintenance rules — every agent session touching this repo must follow them.

## 1. Status at a glance

| Feature (vision doc §6) | Status |
|---|---|
| 6.2 Recipe Library — manual entry | ✅ Built |
| 6.2 Recipe Library — URL import | ✅ Built (general-purpose, via schema.org JSON-LD — no priority sites) |
| 6.2 Rating system | ✅ Built |
| 6.1 Recipe Finder | ⬜ Not started (blocked on open question: external API vs. library-only search) |
| 6.3 Dinner Planner | ⬜ Not started |
| 6.4 Grocery List | ⬜ Not started |

## 2. Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), TypeScript, React 19
- **Styling:** Tailwind CSS v4 (utility classes only, no component library)
- **Database:** SQLite via Prisma ORM
  - Prisma pinned to **6.19.3** (both `prisma` and `@prisma/client`) — deliberately not on 7.x. Prisma 7 moved the datasource `url` out of `schema.prisma` and into a `prisma.config.ts` + driver-adapter model; that's unnecessary complexity for a single-user SQLite app, so we stayed on the last version with classic `datasource { url = env(...) }` config. Do not upgrade past 6.x without re-evaluating this tradeoff.
  - Local DB file: `prisma/dev.db` (gitignored). Connection string in `.env` (gitignored): `DATABASE_URL="file:./dev.db"`.
- **Auth:** none yet (single-user, no login implemented). Vision doc calls for "basic account/login" eventually (§5) — not built.
- **Mutations:** Next.js Server Actions (`"use server"` functions in `actions.ts` files), no separate REST/API routes.
- **Dev server / preview:** `.claude/launch.json` runs `npm run dev` on port 3000 for the Claude Code browser preview tool.

## 3. Data model

Defined in [`prisma/schema.prisma`](../prisma/schema.prisma).

```
Recipe
  id               String   @id @default(cuid())
  title            String
  sourceUrl        String?
  servings         Int?
  prepTimeMinutes  Int?
  cookTimeMinutes  Int?
  skillTags        String?   // comma-separated, e.g. "grill-friendly,one-pan"
  cuisineTags      String?   // comma-separated
  steps            String?   // freeform multi-line text
  rating           Int?      // 1-5
  makeAgain        Boolean?
  lastMadeAt       DateTime?
  createdAt / updatedAt
  ingredients      Ingredient[]

Ingredient
  id        String  @id @default(cuid())
  recipeId  String  -> Recipe (onDelete: Cascade)
  name      String
  quantity  String?   // string, not numeric — handles "1/2", "to taste", etc.
  unit      String?
  position  Int       // display order within the recipe
```

**Deliberate simplifications (matches vision doc's non-goals, §4):**
- Tags (`skillTags`, `cuisineTags`) are plain comma-separated strings, not a normalized tag table. Filtering/sorting on them happens in application code after fetch (fine at personal-library scale). Revisit only if tag volume or cross-recipe tag management becomes a real need.
- No `Ingredient` master table — ingredients are structured fields *on* a recipe only, per vision doc's "Standalone Ingredient Library" non-goal.
- No units-of-measure normalization or conversion — `quantity`/`unit` are free-text strings.

## 4. Routes & server actions

| Route | Purpose |
|---|---|
| `/` | Redirects to `/recipes` |
| `/recipes` | Library list — sort (`?sort=title\|rating\|lastMade\|cuisine`) and skill-tag filter (`?skill=...`) via query params, computed server-side after fetching all recipes |
| `/recipes/new` | Manual add form |
| `/recipes/import` | URL import — client component; fetches + parses on demand, then reuses `RecipeForm` pre-filled for review before saving |
| `/recipes/[id]` | Detail view — rating selector, "make again" toggle, "mark made today", edit/delete |
| `/recipes/[id]/edit` | Edit form (same `RecipeForm` component as `/recipes/new`) |

Server actions in [`src/app/recipes/actions.ts`](../src/app/recipes/actions.ts): `createRecipe`, `updateRecipe`, `deleteRecipe`, `rateRecipe`, `toggleMakeAgain`, `markMadeToday`, `extractRecipeFromUrl`. All revalidate the relevant paths and redirect where appropriate (`extractRecipeFromUrl` just returns parsed data — no DB write).

Ingredients are passed from the client form to the server action as a JSON string in a hidden `ingredientsJson` field (see `RecipeForm.tsx`) rather than as repeated indexed form fields — simplest way to submit a dynamic-length list through a native form POST to a Server Action.

### URL import

[`src/lib/recipeImport.ts`](../src/lib/recipeImport.ts) implements general-purpose extraction (vision doc §6.2 open question — resolved as: no priority sites, general-purpose only):

- Server-side `fetch()` of the given URL, then regex-extraction of `<script type="application/ld+json">` blocks (no HTML parser dependency).
- Recursively searches parsed JSON-LD (including `@graph` wrappers and arrays) for a node whose `@type` is `Recipe`.
- Pulls `name`, `recipeIngredient`, `recipeInstructions` (handles string arrays, `HowToStep`/`HowToSection` shapes), `recipeYield`, `prepTime`/`cookTime` (ISO 8601 durations), `recipeCuisine`.
- `parseIngredientLine()` heuristically splits each ingredient string into `{name, quantity, unit}` via a leading-quantity regex (handles fractions, decimals, ranges) and a fixed unit word list. This is heuristic, not authoritative — the import page always shows the parsed result in the same editable `RecipeForm` before it's saved, per the vision doc's "review/edit before saving" requirement (§6.2).
- On failure (no JSON-LD, no `Recipe` node, network/HTTP error) throws a user-facing `Error` with a message telling the user to fall back to manual entry — no partial/silent saves.
- Verified against a real-world site (allrecipes.com) during development: correctly extracted title, 9 ingredients with quantity/unit/name, numbered steps, servings, prep/cook time, and cuisine.

## 5. Required vs. optional fields (manual entry)

Per product decision: **only `title` and at least one ingredient (with a name) are required.** Everything else — steps, servings, prep/cook time, tags, source URL — is optional, to keep the "quickly save a recipe" path low-friction.

## 6. Known gaps / deferred (intentional, not bugs)

- No authentication — single browser/device use for now.
- No Recipe Finder yet — blocked on deciding whether it searches an external recipe API or only the local Library (vision doc §9, open question 1).
- Grocery list section-grouping, planner history, and "already have" exclusion are all still-open questions from the vision doc (§9) and unimplemented since the features they belong to (Planner, Grocery List) don't exist yet.

## 7. Conventions for this codebase

- Server Components by default; only reach for a Client Component (`"use client"`) when you need interactivity that can't be done with a plain `<form action={...}>` — e.g. `RecipeForm`'s dynamic ingredient rows.
- Don't add `onChange`-triggers-submit patterns on server-rendered form elements — that requires a Client Component. Prefer an explicit submit button (see the rating selector in `/recipes/[id]/page.tsx`) unless the interactivity is worth promoting the whole form to a Client Component.
- `params` and `searchParams` are `Promise`s in this Next.js version — always `await` them in page components.
- Keep `docs/food-planner-product-vision.md` as the source of truth for *what* to build and *why*; this file (`docs/spec.md`) tracks *what has been built* and *how*.

---

## Keeping this spec updated

**Any agent (Claude or otherwise) that changes app behavior, data model, routes, tech stack, or resolves one of the vision doc's open questions must update this file in the same session/commit as the change.** Specifically:

- Adding/changing a Prisma model or field → update §3.
- Adding/removing a route or server action → update §4.
- Changing which fields are required, or other product-behavior decisions → update §5.
- Finishing a feature from §1's table → flip its status, and update §6 if it removes a gap.
- Introducing a new library, or making a deliberate version-pinning decision (like the Prisma 6 vs. 7 call in §2) → record it and *why*, not just what.
- Establishing a new pattern other code should follow → add it to §7.

Do not let this document drift into aspirational territory — if something is planned but not built, it belongs in the vision doc's build order, not here. This file only describes what exists in the codebase right now.
