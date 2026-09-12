import { getIngredientLibrary } from "../recipes/actions";
import { createLibraryItem, deleteLibraryItem, renameLibraryItem } from "./actions";

export default async function IngredientsPage() {
  const items = await getIngredientLibrary();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Ingredient Library</h1>

      <form
        action={createLibraryItem}
        className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="new-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="new-name"
            name="name"
            required
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="new-unit" className="text-sm font-medium">
            Default unit
          </label>
          <input
            id="new-unit"
            name="defaultUnit"
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
        >
          Add ingredient
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const boundRename = renameLibraryItem.bind(null, item.id);
          const boundDelete = deleteLibraryItem.bind(null, item.id);
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 bg-white p-3"
            >
              <form action={boundRename} className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor={`name-${item.id}`} className="text-xs text-zinc-500">
                    Name
                  </label>
                  <input
                    id={`name-${item.id}`}
                    name="name"
                    defaultValue={item.name}
                    required
                    className="rounded border border-zinc-300 px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`unit-${item.id}`} className="text-xs text-zinc-500">
                    Default unit
                  </label>
                  <input
                    id={`unit-${item.id}`}
                    name="defaultUnit"
                    defaultValue={item.defaultUnit ?? ""}
                    className="rounded border border-zinc-300 px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
                >
                  Save
                </button>
              </form>
              <form action={boundDelete}>
                <button
                  type="submit"
                  className="rounded border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </form>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-sm text-zinc-500">No ingredients in the library yet.</li>
        )}
      </ul>
    </div>
  );
}
