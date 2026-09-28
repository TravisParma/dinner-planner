"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { INGREDIENT_TABLE_GRID } from "./grid";


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
        className="o-rule flex flex-wrap items-center gap-2 py-2.5 last:border-b-0"
      >
        <input
          name="name"
          defaultValue={item.name}
          required
          autoFocus
          aria-label="Name"
          className="o-input min-w-[160px] flex-[3] bg-bg py-1 text-[14px]"
        />
        <input
          name="defaultUnit"
          defaultValue={item.defaultUnit ?? ""}
          placeholder="Unit"
          aria-label="Default unit"
          className="o-input w-24 flex-1 bg-bg py-1 text-[14px]"
        />
        <div className="flex items-center gap-1">
          <SubmitButton className="o-pill o-primary px-4 py-2 text-[13px]">Save</SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full px-3 py-2 text-[13px] opacity-60 hover:opacity-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className="o-rule flex items-center gap-2 py-1.5 text-[14px] last:border-b-0 md:grid"
      style={{ gridTemplateColumns: INGREDIENT_TABLE_GRID }}
    >
      <div className="min-w-0 flex-1">
        <span className="font-semibold md:font-normal">{item.name}</span>
        <span className="block text-[12px] opacity-60 md:hidden">
          {[item.defaultUnit, `${count} ${count === 1 ? "recipe" : "recipes"}`]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <span className="hidden opacity-70 md:block">{item.defaultUnit ?? "—"}</span>
      <span className="hidden md:block">
        <span
          className={`o-tag ${count > 0 ? "bg-accent-2-100 text-accent-2-800" : "border border-divider opacity-60"}`}
        >
          {count} {count === 1 ? "recipe" : "recipes"}
        </span>
      </span>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="o-icon-btn text-accent-700"
          aria-label={`Edit ${item.name}`}
        >
          <Pencil strokeWidth={2.5} size={15} />
        </button>
        <form action={deleteAction}>
          <SubmitButton
            confirm={
              count > 0
                ? `Remove “${item.name}” from the library? It's still used in ${count} ${count === 1 ? "recipe" : "recipes"} (those recipes won't change).`
                : `Remove “${item.name}” from the library?`
            }
            pendingLabel={null}
            className="o-icon-btn text-danger"
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 strokeWidth={2.5} size={15} />
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
