# Family Dinner Planner — Technical Spec

> **This is a living document.** It describes what is actually built, not what's planned.
> See [food-planner-product-vision.md](food-planner-product-vision.md) for the product goals and non-goals this implements.
> See the "Keeping this spec updated" section at the bottom for maintenance rules — every agent session touching this repo must follow them.

## 1. Status at a glance

| Feature (vision doc §6) | Status |
|---|---|
| 6.2 Recipe Library — manual entry | ✅ Built |
| 6.2 Recipe Library — URL import | ➖ Removed (was built via schema.org JSON-LD; pulled per product decision — see git history for `src/lib/recipeImport.ts`) |
| 6.2 Rating system | ✅ Built |
| 6.1 Recipe Finder | ✅ Built (library-only search, folded into `/recipes`) |
| 6.3 Dinner Planner | ✅ Built (with persisted history) |
| 6.4 Grocery List | ✅ Built (flat/alphabetical, no "already have" exclusion) |

## 2. Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), TypeScript, React 19
- **Styling:** Tailwind CSS v4 (utility classes only, no component library)
- **Database:** SQLite via Prisma ORM
  - Prisma pinned to **6.19.3** (both `prisma` and `@prisma/client`) — deliberately not on 7.x. Prisma 7 moved the datasource `url` out of `schema.prisma` and into a `prisma.config.ts` + driver-adapter model; that's unnecessary complexity for a single-user SQLite app, so we stayed on the last version with classic `datasource { url = env(...) }` config. Do not upgrade past 6.x without re-evaluating this tradeoff.
  - Local DB file: `prisma/dev.db` (gitignored). Connection string in `.env` (gitignored): `DATABASE_URL="file:./dev.db"`.
- **Auth:** HTTP Basic Auth via `src/middleware.ts`, gating every route except `_next/*` (includes the dev-mode HMR websocket, not just static/image assets) and `favicon.ico`. Single shared username/password pair from `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` env vars — not per-user accounts, no login UI or session/cookie. Fails closed: if either env var is unset, every request gets a `500` rather than passing through unauthenticated. Credential comparison uses a manual constant-time byte compare (not `===`) since this is the only auth layer. Vision doc's eventual "basic account/login" (§5) is still open — this is a stopgap for internet-exposed hosting, not that feature.
- **Mutations:** Next.js Server Actions (`"use server"` functions in `actions.ts` files), no separate REST/API routes.
- **Dev server / preview:** `.claude/launch.json` runs `npm run dev` on port 3000 for the Claude Code browser preview tool.
- **Deployment:** Dockerized for self-hosting (e.g. home lab) via `Dockerfile` + `docker-compose.yml`. `next.config.ts` sets `output: "standalone"` so the production image ships only the traced `node_modules` instead of a full install. Base image is `node:20-bookworm-slim` (not Alpine) in every build stage specifically so Prisma's default `binaryTargets = ["native"]` resolves consistently against glibc — mixing glibc/musl across build and runtime stages breaks Prisma's engine binary at runtime. `docker-entrypoint.sh` runs `prisma migrate deploy` against a volume-mounted SQLite file before starting `node server.js`, so migrations apply to the persisted database on every container start rather than being baked into the image. See §8.

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
  name      String    // pure ingredient name — no prep style (see prepNote)
  quantity  String?   // string, not numeric — handles "1/2", "to taste", etc.
  unit      String?
  prepNote  String?   // free-text prep style, e.g. "chopped" — kept out of `name` so
                       // IngredientLibraryItem only ever collects clean ingredient names
  position  Int       // display order within the recipe

IngredientLibraryItem
  id          String   @id @default(cuid())
  name        String   @unique
  defaultUnit String?
  createdAt   DateTime

PlannedMeal
  id        String   @id @default(cuid())
  date      DateTime @unique   // calendar day, normalized to UTC midnight — see §4
  recipeId  String   -> Recipe (onDelete: Cascade)
  createdAt / updatedAt

GroceryListItem
  id         String   @id @default(cuid())
  rangeStart String    // "YYYY-MM-DD", matches a planner/grocery-list view's ?start=
  rangeEnd   String    // "YYYY-MM-DD"
  itemKey    String?   // set for recipe-derived items (see §4); null for manually-added items
  name       String
  quantity   String?
  unit       String?
  checked    Boolean  @default(false)
  removed    Boolean  @default(false)
  createdAt  DateTime @default(now())
  @@unique([rangeStart, rangeEnd, itemKey])
```

**Deliberate simplifications (matches vision doc's non-goals, §4):**
- Tags (`skillTags`, `cuisineTags`) are plain comma-separated strings, not a normalized tag table. Filtering/sorting on them happens in application code after fetch (fine at personal-library scale). Revisit only if tag volume or cross-recipe tag management becomes a real need.
- `IngredientLibraryItem` is a lightweight lookup list, not a managed entity — it partially resolves the vision doc's "Standalone Ingredient Library" non-goal (§4), but deliberately stays minimal: there's no FK from `Ingredient` to it (picking from the library just copies `name`/`unit` into a new `Ingredient` row) and no UI to rename/delete library entries. It only grows: every ingredient name saved on any recipe is auto-upserted into it (case-sensitive exact match on `name`). Prep style (e.g. "chopped") lives in the separate `Ingredient.prepNote` field, entered via its own form input, specifically so it never leaks into `name` and pollutes the library with prep-qualified duplicates (e.g. "onion" vs "onion, chopped") — see "Ingredient library picker" in §4. Recipes saved before `prepNote` existed may still have prep text baked into `name`; this was a deliberate one-time exception, not cleaned up retroactively. Revisit with a management page if near-duplicates still accumulate for other reasons.
- No units-of-measure normalization or conversion — `quantity`/`unit` are free-text strings.
- `PlannedMeal` is one row per calendar day (`date` is `@unique`), holding exactly one recipe. There's no "meal slot" concept (breakfast/lunch/dinner) — this app is dinner-only per the vision doc's scope, so a day maps to a single planned recipe. Assigning a new recipe to an already-planned day upserts (replaces) rather than adding a second row.
- `GroceryListItem` stores only *interaction state* (checked/removed) for recipe-derived items, keyed by `(rangeStart, rangeEnd, itemKey)` — it does **not** store the computed quantity/name/unit as the source of truth for those; that's always recomputed fresh from the current plan on every render (see §4). The `name`/`quantity`/`unit` columns on a generated-item row only exist so the DB is legible when inspected directly; they're not read back for display. Manual items (`itemKey: null`) are the opposite — those columns *are* the source of truth, since there's no recipe data to recompute them from. SQLite treats multiple `NULL`s as distinct under a unique index, so any number of manual items can coexist per range without conflicting with the `@@unique` constraint.

## 4. Routes & server actions

| Route | Purpose |
|---|---|
| `/` | Redirects to `/recipes` |
| `/recipes` | Library list **and Recipe Finder** — sort (`?sort=title\|rating\|lastMade\|cuisine`), keyword search (`?q=...`, matches title or ingredient names), skill-tag filter (`?skill=...`), and cuisine/diet-tag filter (`?cuisine=...`), all computed server-side in-memory after fetching all recipes |
| `/recipes/new` | Manual add form |
| `/recipes/[id]` | Detail view — rating selector, "make again" toggle, "mark made today", edit/delete |
| `/recipes/[id]/edit` | Edit form (same `RecipeForm` component as `/recipes/new`) |
| `/planner` | Dinner Planner — `?start=YYYY-MM-DD&days=1-7` (defaults: today, 7) picks the visible date range; each day shows its assigned recipe (or an assign form) |
| `/grocery-list` | Grocery List — same `?start=&days=` convention as `/planner`; interactive checklist derived from that range's planned meals, plus manually-added items |

Server actions in [`src/app/recipes/actions.ts`](../src/app/recipes/actions.ts): `createRecipe`, `updateRecipe`, `deleteRecipe`, `rateRecipe`, `toggleMakeAgain`, `markMadeToday`, `getIngredientLibrary`. All revalidate the relevant paths and redirect where appropriate (`getIngredientLibrary` just returns data — no DB write).

Ingredients are passed from the client form to the server action as a JSON string in a hidden `ingredientsJson` field (see `RecipeForm.tsx`) rather than as repeated indexed form fields — simplest way to submit a dynamic-length list through a native form POST to a Server Action.

### Ingredient library picker

`RecipeForm.tsx` (used by `/recipes/new` and `/recipes/[id]/edit`) takes an optional `libraryItems` prop — `{id, name, defaultUnit}[]` fetched via `getIngredientLibrary()` — and renders an "Add from ingredient library" combobox (native `<input list>` + `<datalist>`, no extra dependency) above the ingredient rows. Picking a name appends a new ingredient row pre-filled with that item's `name` and `defaultUnit`; quantity is always left blank for the user to fill in. The free-text "+ Add ingredient" row is unchanged and still works for one-off items.

`createRecipe`/`updateRecipe` upsert every saved ingredient's `name` into `IngredientLibraryItem` (keeping the first-seen `unit` as `defaultUnit`), so the library grows automatically from normal recipe entry — no separate "manage ingredients" step exists. Both pages (`new`, `[id]/edit`) are Server Components and fetch the library directly via Prisma.

Each ingredient row also has its own free-text "Prep" input, stored as `Ingredient.prepNote` and shown on the recipe detail page as a trailing `, <prepNote>` after the name — but it is *not* part of `name` and is never sent to `IngredientLibraryItem`, so prep style (chopped, diced, melted, ...) can't create near-duplicate library entries.

### Recipe Finder

**Resolved as library-only** (vision doc §9, open question 1) — no external recipe database/API. Since every result is therefore already "in the Library" by definition, the vision doc's "distinguish Library recipes from new discoveries" requirement (§6.1) is moot and wasn't built.

Given that, Recipe Finder isn't a separate route — it's implemented as the `q` (keyword) and `cuisine` filters added to the existing `/recipes` list, alongside the skill-tag filter that page already had. A second page running the same query against the same table would have been a near-duplicate of `/recipes`; folding it in was the simpler choice and keeps one search/filter implementation instead of two. If the external-API option is ever revisited, that's the point where a genuinely separate Finder page (with its own "Library vs. new" distinction) would earn its keep.

- Keyword search (`?q=`) matches case-insensitively against recipe title **or any ingredient name** — e.g. searching "ketchup" finds "Easy Meatloaf" even though "ketchup" isn't in the title.
- All filtering (`q`, `skill`, `cuisine`) happens in-memory after fetching the full recipe list, same as the pre-existing skill filter — SQLite via Prisma has no case-insensitive `contains` mode (that's Postgres/MySQL-only), and in-memory filtering is fine at personal-library scale.

### Dinner Planner

Server actions in [`src/app/planner/actions.ts`](../src/app/planner/actions.ts): `setPlannedMeal(dateStr, formData)` (upserts by date), `clearPlannedMeal(dateStr)`.

- **History is persisted** (vision doc §9, open question 4 — resolved as: save history). `PlannedMeal` rows are keyed by calendar date, not tied to a "current plan" concept, so navigating to any past or future date range via `?start=&days=` just queries that window — no separate archiving step needed.
- Dates are normalized to **UTC midnight** on write (`toMidnightUTC` in `actions.ts`) and read back with `.toISOString().slice(0, 10)` for lookup-map keys, so the unique constraint on `PlannedMeal.date` behaves like a date (not datetime) key regardless of what time of day the action ran. There's no timezone handling beyond this — fine for a single-user app, would need revisiting for multi-timezone use.
- Recipe assignment uses a plain `<select>` of all library recipes (sorted by title) rather than a search/browse widget — acceptable at personal-library scale; revisit if the library grows large enough that scrolling a `<select>` becomes painful (at that point, consider reusing Recipe Finder's search/filter here too).
- Day count is clamped server-side to 1–7 regardless of the `days` query param, per vision doc §6.3.

### Grocery List

[`src/lib/groceryList.ts`](../src/lib/groceryList.ts) does the aggregation; server actions in [`src/app/grocery-list/actions.ts`](../src/app/grocery-list/actions.ts): `setGeneratedItemChecked`, `removeGeneratedItem`, `addManualItem`, `setManualItemChecked`, `deleteManualItem`.

- **Layout: flat/alphabetical, no store-section grouping** (vision doc §9, open question 5 — resolved this way as the simpler v1 default; revisit if the list gets long enough that grouping earns its complexity).
- **No "already have" exclusion** (§9, open question 6 — resolved as: not built, since pantry-tracking-adjacent features are an explicit non-goal per vision doc §4). Removing a generated item is the only way to keep something recurring off the list, and that removal only applies to the exact date range it was removed from.
- **Aggregation is naive, exactly per vision doc §6.4**: ingredients across all planned recipes in the range are grouped by `(name, unit)` (case-insensitive, exact string match — "1 cup" and "1 cups" are different groups, as are different unit spellings). Quantities are summed only when parseable (`aggregateIngredients`/`parseQuantity` in `groceryList.ts` handle integers, decimals, simple fractions like `1/2`, and mixed numbers like `1 1/2`); non-parseable quantities (e.g. "to taste") are appended as extra text rather than dropped. No unit conversion is attempted or planned.
- **Generated items are never persisted as line items** — see §3's note on `GroceryListItem`. This means the list truly "regenerates when the plan changes" (vision doc §6.4) automatically, with no explicit regenerate step; only the checked/removed *state* for a given `(rangeStart, rangeEnd, itemKey)` survives a plan change, and only for items that still compute to the same key.
- The checklist (`GroceryChecklist.tsx`) is a Client Component for immediate check/remove feedback — the one deliberate exception to this codebase's "Server Component by default" convention (§7), justified because a shopping checklist is a fundamentally interactive, high-frequency-tap UI. It's re-keyed from the parent Server Component on every render (`key={rows.map(r => \`${r.key}:${r.checked}\`).join(",")}` in `page.tsx`) rather than using a `useEffect` to sync incoming props into local state — syncing state from props via effect is an anti-pattern our lint config (`react-hooks/set-state-in-effect`) rejects; remounting via `key` is the correct fix and was verified live (adding/removing items from elsewhere on the page updates the checklist immediately, no reload needed).

## 5. Required vs. optional fields (manual entry)

Per product decision: **only `title` and at least one ingredient (with a name) are required.** Everything else — steps, servings, prep/cook time, tags, source URL — is optional, to keep the "quickly save a recipe" path low-friction.

## 6. Known gaps / deferred (intentional, not bugs)

- No real accounts/login — HTTP Basic Auth (single shared username/password via env vars, see §2 and §8) gates access for internet-exposed hosting, but there's no per-user identity, session, or login UI.
- Grocery List: flat/alphabetical only (no store-section grouping) and no "already have" exclusion — both deliberate v1 defaults, see the "Grocery List" subsection in §4.

## 7. Conventions for this codebase

- Server Components by default; only reach for a Client Component (`"use client"`) when you need interactivity that can't be done with a plain `<form action={...}>` — e.g. `RecipeForm`'s dynamic ingredient rows.
- Don't add `onChange`-triggers-submit patterns on server-rendered form elements — that requires a Client Component. Prefer an explicit submit button (see the rating selector in `/recipes/[id]/page.tsx`) unless the interactivity is worth promoting the whole form to a Client Component.
- `params` and `searchParams` are `Promise`s in this Next.js version — always `await` them in page components.
- If a Client Component initializes local state from a prop and that prop can change after mount (e.g. after a sibling/parent Server Component revalidates), don't sync it with `useEffect(() => setState(prop), [prop])` — this repo's lint config (`react-hooks/set-state-in-effect`) flags that as an anti-pattern. Force a remount instead by giving the component a `key` derived from the data that should invalidate it (see `GroceryChecklist` in the Grocery List section of §4 for a worked example).
- Keep `docs/food-planner-product-vision.md` as the source of truth for *what* to build and *why*; this file (`docs/spec.md`) tracks *what has been built* and *how*.
- `src/middleware.ts` implements the app-wide Basic Auth gate (§2, §8). Any new route is protected automatically by its matcher — don't add a parallel auth check per-route, and don't narrow the matcher without a specific reason (it's deliberately "everything except static assets").

## 8. Deployment (Docker / home lab)

Files: [`Dockerfile`](../Dockerfile), [`docker-compose.yml`](../docker-compose.yml), [`docker-entrypoint.sh`](../docker-entrypoint.sh), [`.dockerignore`](../.dockerignore).

- **Build:** multi-stage (`deps` → `builder` → `runner`), all stages on `node:20-bookworm-slim`. `builder` runs `prisma generate` then `npm run build` (standalone output, see §2). `runner` installs `openssl` (required for Prisma's engine to link against; not present on slim by default), copies `.next/standalone`, `.next/static`, and `public/` (the latter two aren't included in standalone tracing and must be copied explicitly), copies `prisma/schema.prisma` + `prisma/migrations/`, and explicitly copies the Prisma CLI (`node_modules/.bin/prisma`, `node_modules/prisma`, `node_modules/@prisma`) since nothing in app code imports the CLI so Next's build tracing wouldn't otherwise include it — but it's needed at container startup to run migrations. Runs as a non-root `nextjs` user.
- **Startup:** `docker-entrypoint.sh` runs `prisma migrate deploy` (applies existing migrations only, non-interactive — never `migrate dev` in a container) against the `DATABASE_URL` from env, then `exec node server.js` (not `npm start`, so Node is PID 1 and receives `SIGTERM` directly for clean shutdown on `docker compose down`/restart).
- **Persistence:** `docker-compose.yml` mounts a named volume (`dinner-planner-data`) at `/data` inside the container, with `DATABASE_URL=file:/data/dev.db` — the SQLite file lives on the volume, not inside the image/container filesystem, so it survives `docker compose down && up` and image rebuilds.
- **Auth env vars:** `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`, read by `src/middleware.ts` (§2). Set via a `.env` file next to `docker-compose.yml` (gitignored, not committed) — compose auto-loads it.
- **Networking:** the compose file publishes a plain host port (`3000:3000`) and does not assume any particular reverse proxy (no Traefik labels) — it's written for a setup where an existing reverse proxy (e.g. Nginx Proxy Manager, Caddy) sits in front and is configured separately. A commented-out `networks:` block shows how to instead attach this service to an external Docker network if the proxy itself runs as a container.
- **No multi-arch build** — targets x86_64/amd64 only; revisit the base image / build if ARM hosting (e.g. Raspberry Pi) is ever needed.

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
