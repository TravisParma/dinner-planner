"use client";

import { useState } from "react";

const GRID = "minmax(0,1fr) 140px 150px";

export default function IngredientRow({
  item,
  count,
  renameAction,
  deleteAction,
}: {
  item: { id: string; name: string; defaultUnit: string | null };
  count: number;
  renameAction: (formData: FormData) => void | Promise<void>;
  deleteAction: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await renameAction(formData);
          setEditing(false);
        }}
        className="o-rule grid items-center gap-2 py-2"
        style={{ gridTemplateColumns: GRID }}
      >
        <input
          name="name"
          defaultValue={item.name}
          required
          className="o-input bg-bg py-1 text-[14px]"
        />
        <input
          name="defaultUnit"
          defaultValue={item.defaultUnit ?? ""}
          className="o-input bg-bg py-1 text-[14px]"
        />
        <div className="flex items-center justify-between gap-2 text-sm">
          <button type="submit" className="text-accent-700 hover:underline">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="opacity-60 hover:underline">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="o-rule grid items-center gap-2 py-2 text-[14px]" style={{ gridTemplateColumns: GRID }}>
      <span>{item.name}</span>
      <span className="opacity-70">{item.defaultUnit ?? ""}</span>
      <div className="flex items-center justify-between gap-2">
        <span className="opacity-70">
          {count} {count === 1 ? "recipe" : "recipes"}
        </span>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => setEditing(true)} className="text-accent-700 hover:underline">
            Edit
          </button>
          <form action={deleteAction}>
            <button type="submit" className="hover:underline" style={{ color: "#8c2f11" }}>
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
