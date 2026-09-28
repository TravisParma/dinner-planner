import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import RecipeForm from "../../RecipeForm";
import { updateRecipe, getIngredientLibrary } from "../../actions";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, libraryItems] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { orderBy: { position: "asc" } } },
    }),
    getIngredientLibrary(),
  ]);

  if (!recipe) notFound();

  const boundUpdate = updateRecipe.bind(null, recipe.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: `/recipes/${recipe.id}`, label: recipe.title }}
        title="Edit recipe"
      />
      <RecipeForm
        action={boundUpdate}
        submitLabel="Save Changes"
        cancelHref={`/recipes/${recipe.id}`}
        libraryItems={libraryItems}
        initial={{
          title: recipe.title,
          sourceUrl: recipe.sourceUrl ?? "",
          servings: recipe.servings?.toString() ?? "",
          prepTimeMinutes: recipe.prepTimeMinutes?.toString() ?? "",
          cookTimeMinutes: recipe.cookTimeMinutes?.toString() ?? "",
          skillTags: recipe.skillTags ?? "",
          cuisineTags: recipe.cuisineTags ?? "",
          steps: recipe.steps ?? "",
          ingredients: recipe.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity ?? "",
            unit: ing.unit ?? "",
            prepNote: ing.prepNote ?? "",
          })),
        }}
      />
    </div>
  );
}
