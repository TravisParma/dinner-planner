---
name: dinner-planner-api
description: Add or partially update recipes and ingredient-library entries in the Family Dinner Planner app over its JSON API (POST/PATCH/GET /api/recipes, /api/recipes/[id], /api/ingredients). Use when asked to import, bulk-add, fix a field on, or script the creation/update of recipes or ingredients for this app, rather than driving the web UI by hand.
---

# Dinner Planner JSON API

REST endpoints on the running Family Dinner Planner app let a script create and partially update recipes, and create ingredient-library entries, without opening the browser. This skill is the operating manual for calling them.

**Source of truth:** [`docs/spec.md`](../../../docs/spec.md) §4 "JSON API (for scripts/automation)" describes the same endpoints for humans. If that section and this file ever disagree, `docs/spec.md` wins — re-read the route files (`src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts`, `src/app/api/ingredients/route.ts`, `src/lib/recipes.ts`, `src/lib/ingredientLibrary.ts`) and update this skill to match. **Whenever those routes or their validation change, update this file in the same turn** — don't let it drift the way an out-of-date spec would.

**This file is duplicated at [`.agents/skills/dinner-planner-api/SKILL.md`](../../../.agents/skills/dinner-planner-api/SKILL.md).** `.claude/skills/` is where Claude Code actually discovers and loads skills from; `.agents/skills/` is kept as an identical copy per an earlier explicit request. Edit both together — they must stay byte-identical (aside from this note).

## Prerequisites

- The app must be running and reachable. See "Known environments" below for hostnames; ask the user to confirm/update if unsure or unlisted.
- Every route is behind the app-wide HTTP Basic Auth gate (`src/middleware.ts`) — there is no separate API key. You need `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` credentials. **Never hardcode a real password in this file, in spec.md, or in any file that gets committed.** Read credentials from an environment variable (e.g. the local `.env`, gitignored) or ask the user to supply them at call time.
- Recipes can be created and partially updated (`PATCH /api/recipes/[id]`). There is **no delete endpoint for anything, and no update endpoint for ingredient-library entries** — removing a recipe/library item or renaming a library entry still requires the web UI (`/recipes/[id]/edit`, `/ingredients`) with a browser tool.

## Known environments

| Environment | Base URL | Credentials |
|---|---|---|
| Local dev (`npm run dev`) | `http://localhost:3000` | `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` in the repo's local `.env` (gitignored) |
| Home-lab / live (Docker, §8 of spec.md) | `http://192.168.68.75:3000` | Ask the user — do not store this here. LAN IP may change if the host isn't DHCP-reserved; confirm with the user before assuming it's still current. |

Update this table (hostname only, never credentials) whenever a deployment moves or a new one comes online.

## Endpoints

### `GET /api/recipes`
Lists existing recipes: `{ recipes: {id, title, sourceUrl, rating, createdAt}[] }`, sorted by title. Deliberately minimal (no ingredients/steps) — use it to check what already exists before importing more, so you don't create duplicate titles.

### `POST /api/recipes`
Creates one recipe. JSON body:

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | string | non-empty |
| `ingredients` | yes | array of `{name, quantity?, unit?, prepNote?}` | at least one entry must have a non-empty `name`; `quantity`/`unit`/`prepNote` are free-text strings |
| `sourceUrl` | no | string | |
| `servings` | no | number or numeric string | |
| `prepTimeMinutes` | no | number or numeric string | |
| `cookTimeMinutes` | no | number or numeric string | |
| `steps` | no | string | freeform multi-line — **format as a numbered list** (`"1. Preheat...\n2. Mix...\n3. ..."`), one step per line, even if the source recipe (a webpage, a note, a photo) isn't numbered itself. The web form's placeholder models this convention and the detail page just renders the string as-is with no numbering added for you, so an unnumbered `steps` string displays unnumbered. |
| `skillTags` | no | string **or** array of strings | `"grill-friendly, one-pan"` or `["grill-friendly", "one-pan"]` — either is normalized to the same comma-separated storage format |
| `cuisineTags` | no | string **or** array of strings | same either-shape rule as `skillTags` |

Every ingredient's `name` is auto-upserted into the ingredient library (same behavior as the web form). Returns `201 {recipe}` on success, `400 {error}` if `title` or `ingredients` is missing/empty.

### `PATCH /api/recipes/[id]`
Partially updates one recipe. JSON body: **any subset** of the `POST /api/recipes` fields above — only keys present in the body are changed; omitted fields keep their current value. This is the right tool for fixing one thing on an already-created recipe (reformatting `steps`, correcting a typo, adding a tag) without resending the whole recipe.

- `title` and `ingredients`, if included in the body, still can't be emptied (same "title + ≥1 named ingredient" rule as creation).
- If `ingredients` is included, it **fully replaces** the existing ingredient list (delete-all-then-recreate, same as the web edit form) and re-upserts those names into the library. Omit it entirely to leave existing ingredients untouched — don't include a partial/guessed ingredient list just to change something else.
- Returns `200 {recipe}` on success, `400 {error}` for an empty body (`{}`) or invalid fields, `404 {error}` if the id doesn't exist.

### `GET /api/ingredients`
Lists the ingredient library: `{ items: {id, name, defaultUnit}[] }`.

### `POST /api/ingredients`
Creates one library entry. JSON body: `{name, defaultUnit?}`. Returns `201 {item}` on success, `400 {error}` if `name` is missing, `409 {error}` if `name` already exists — this is expected/benign when bulk-importing, not a failure worth retrying differently.

## Calling the API

Prefer `curl` with `-u`:

```sh
curl -u "$BASIC_AUTH_USER:$BASIC_AUTH_PASSWORD" \
  -X POST -H "Content-Type: application/json" \
  -d '{"title":"Tacos","ingredients":[{"name":"Ground beef","quantity":"1","unit":"lb"}],"skillTags":["grill-friendly"]}' \
  http://<host>:3000/api/recipes

curl -u "$BASIC_AUTH_USER:$BASIC_AUTH_PASSWORD" \
  -X PATCH -H "Content-Type: application/json" \
  -d '{"steps":"1. Preheat...\n2. Cook..."}' \
  http://<host>:3000/api/recipes/<id>
```

Never hardcode real credentials in code you write or commit — read them from environment variables or ask the user to supply them at call time.

## Workflow for bulk/scripted imports

1. `GET /api/recipes` (and `/api/ingredients` if relevant) first to see what already exists, so you don't create duplicate titles and can reuse existing ingredient names/casing where they match.
2. For each recipe to add, build the JSON body per the table above — title and ≥1 named ingredient are the only hard requirements; everything else can be omitted if unknown. Number the `steps` (see the table's note above) regardless of how the source formatted them.
3. `POST /api/recipes` one at a time (no batch endpoint exists). Treat a `400` as a real problem to fix (bad input shape); a `409` from `/api/ingredients` just means that name already exists and can be ignored.
4. Summarize what was created (and skipped) for the user rather than assuming silence means success.
5. If a follow-up correction is needed on something already created, use `PATCH /api/recipes/[id]` with just the changed field(s) rather than deleting/recreating (there's no delete endpoint anyway) or resorting to the web UI — the web UI is still the right tool for deletes and ingredient-library renames, but not for a recipe field fix.
