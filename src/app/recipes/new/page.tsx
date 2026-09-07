import RecipeForm from "../RecipeForm";
import { createRecipe, getIngredientLibrary } from "../actions";

export default async function NewRecipePage() {
  const libraryItems = await getIngredientLibrary();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Add a Recipe</h1>
      <RecipeForm action={createRecipe} submitLabel="Save Recipe" libraryItems={libraryItems} />
    </div>
  );
}
