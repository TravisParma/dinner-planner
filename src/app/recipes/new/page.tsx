import PageHeader from "@/components/PageHeader";
import RecipeForm from "../RecipeForm";
import { createRecipe, getIngredientLibrary } from "../actions";

// No dynamic route segment or searchParams here, so Next would otherwise try
// to statically prerender this page at build time — including the DB read
// below, which fails in Docker builds (no DATABASE_URL / real DB yet) and
// would serve stale library data anyway. See docs/spec.md §7.
export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const libraryItems = await getIngredientLibrary();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/recipes", label: "Recipes" }} title="Add a recipe" />
      <RecipeForm action={createRecipe} submitLabel="Save Recipe" libraryItems={libraryItems} />
    </div>
  );
}
