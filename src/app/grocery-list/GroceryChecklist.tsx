"use client";

import { useState, useTransition } from "react";
import {
  deleteManualItem,
  removeGeneratedItem,
  setGeneratedItemChecked,
  setManualItemChecked,
} from "./actions";

export type ChecklistRow = {
  key: string;
  name: string;
  unit: string;
  quantity: string;
  checked: boolean;
  kind: "generated" | "manual";
  itemKey?: string; // generated only
  id?: string; // manual only
};

function formatQtyUnit(quantity: string, unit: string): string {
  return [quantity, unit].filter(Boolean).join(" ");
}

export default function GroceryChecklist({
  rangeStart,
  rangeEnd,
  items,
}: {
  rangeStart: string;
  rangeEnd: string;
  items: ChecklistRow[];
}) {
  const [rows, setRows] = useState(items);
  const [, startTransition] = useTransition();

  function toggle(row: ChecklistRow) {
    const nextChecked = !row.checked;
    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, checked: nextChecked } : r)));
    startTransition(async () => {
      if (row.kind === "generated" && row.itemKey) {
        await setGeneratedItemChecked(
          rangeStart,
          rangeEnd,
          row.itemKey,
          row.name,
          row.unit,
          row.quantity,
          nextChecked
        );
      } else if (row.kind === "manual" && row.id) {
        await setManualItemChecked(row.id, nextChecked);
      }
    });
  }

  function remove(row: ChecklistRow) {
    setRows((prev) => prev.filter((r) => r.key !== row.key));
    startTransition(async () => {
      if (row.kind === "generated" && row.itemKey) {
        await removeGeneratedItem(rangeStart, rangeEnd, row.itemKey, row.name, row.unit, row.quantity);
      } else if (row.kind === "manual" && row.id) {
        await deleteManualItem(row.id);
      }
    });
  }

  if (rows.length === 0) {
    return <p className="text-zinc-500">Nothing on the list for this range yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 rounded border border-zinc-200 bg-white">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-2">
          <label className="flex flex-1 items-center gap-3">
            <input
              type="checkbox"
              checked={row.checked}
              onChange={() => toggle(row)}
              className="h-4 w-4"
            />
            <span className={row.checked ? "text-zinc-400 line-through" : ""}>
              {formatQtyUnit(row.quantity, row.unit) && (
                <span className="mr-1 text-zinc-500">{formatQtyUnit(row.quantity, row.unit)}</span>
              )}
              {row.name}
            </span>
          </label>
          <button
            type="button"
            onClick={() => remove(row)}
            className="text-zinc-400 hover:text-red-600"
            aria-label={`Remove ${row.name}`}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
