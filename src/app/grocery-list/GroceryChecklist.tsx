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
    return <p className="o-card text-sm opacity-70">Nothing on the list for this range yet.</p>;
  }

  const toGet = rows.filter((r) => !r.checked);
  const gathered = rows.filter((r) => r.checked);
  const pct = Math.round((gathered.length / rows.length) * 100);

  const renderRow = (row: ChecklistRow) => (
    <li key={row.key} className="o-rule flex items-center last:border-b-0">
      <button
        type="button"
        onClick={() => toggle(row)}
        aria-pressed={row.checked}
        aria-label={row.checked ? `Mark ${row.name} ungathered` : `Mark ${row.name} gathered`}
        className="flex min-h-[52px] flex-1 items-center gap-3 rounded-[14px] py-2 pl-1 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
            row.checked ? "bg-accent-2-500 text-on-accent" : "border-2 border-divider"
          }`}
        >
          {row.checked && <Check strokeWidth={3.25} size={13} />}
        </span>
        <span className={`flex-1 text-[15px] ${row.checked ? "line-through opacity-45" : ""}`}>
          {row.name}
          {row.kind === "manual" && (
            <span className="ml-2 align-middle text-[10px] uppercase tracking-wide opacity-45">added</span>
          )}
        </span>
        {(row.quantity || row.unit) && (
          <span
            className={`whitespace-nowrap text-[13px] font-semibold ${
              row.checked ? "opacity-40" : "text-accent-700"
            }`}
          >
            {[row.quantity, row.unit].filter(Boolean).join(" ")}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => remove(row)}
        className="o-icon-btn opacity-35 hover:opacity-100"
        aria-label={`Remove ${row.name}`}
      >
        <X strokeWidth={2.75} size={15} />
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3" aria-live="polite">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Gathered"
        >
          <div
            className="h-full rounded-full bg-accent-2-500 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-sm">
          <span className="font-semibold">{gathered.length}</span> of {rows.length} gathered
        </span>
      </div>

      {toGet.length > 0 ? (
        <ul className="o-card grid grid-cols-1 gap-x-8 py-1 md:grid-cols-2">{toGet.map(renderRow)}</ul>
      ) : (
        <p className="o-card flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-2-500 text-on-accent">
            <Check strokeWidth={3.25} size={13} />
          </span>
          Everything&apos;s gathered. Nice.
        </p>
      )}

      {gathered.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] opacity-70">In the cart · {gathered.length}</h2>
          <ul className="grid grid-cols-1 gap-x-8 rounded-[26px] border border-divider px-4 py-1 md:grid-cols-2">
            {gathered.map(renderRow)}
          </ul>
        </section>
      )}
    </div>
  );
}
