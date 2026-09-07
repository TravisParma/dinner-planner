import RecipeForm from "../RecipeForm";
import { createRecipe } from "../actions";

export default function NewRecipePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Add a Recipe</h1>
      <RecipeForm action={createRecipe} submitLabel="Save Recipe" />
    </div>
  );
}
