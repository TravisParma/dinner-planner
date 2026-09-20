"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
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
    return <p className="opacity-60">Nothing on the list for this range yet.</p>;
  }

  return (
    <div className="o-card grid grid-cols-1 gap-x-[35.2px] sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.key} className="o-rule flex items-center gap-3 py-2.5">
          <button
            type="button"
            onClick={() => toggle(row)}
            aria-label={row.checked ? `Mark ${row.name} ungathered` : `Mark ${row.name} gathered`}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              row.checked ? "bg-accent-2-500 text-bg" : "border-[1.5px]"
            }`}
            style={row.checked ? undefined : { borderColor: "color-mix(in srgb, var(--color-text) 30%, transparent)" }}
          >
            {row.checked && <Check strokeWidth={3} size={12} />}
          </button>
          <span className="text-[13px] text-accent-700" style={{ minWidth: "58px" }}>
            {[row.quantity, row.unit].filter(Boolean).join(" ")}
          </span>
          <span className={`flex-1 text-[14px] ${row.checked ? "opacity-40 line-through" : ""}`}>
            {row.name}
          </span>
          <button
            type="button"
            onClick={() => remove(row)}
            className="opacity-40 hover:opacity-100"
            aria-label={`Remove ${row.name}`}
          >
            <X strokeWidth={2.75} size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
