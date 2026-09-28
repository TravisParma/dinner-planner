"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Renders a timestamp in the *viewer's* timezone. Formatting on the server
 * would use the server's zone (UTC in the Docker image), so the server/first
 * paint shows a plain date and the browser swaps in the local
 * "Today, 6:42 PM" / "Sep 27, 2026, 6:42 PM" form after hydration.
 */
export default function LocalTime({ iso }: { iso: string }) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const date = new Date(iso);

  let label: string;
  if (!isClient) {
    label = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } else {
    const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === now.toDateString()) {
      label = `Today, ${time}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = `Yesterday, ${time}`;
    } else {
      label = `${date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
      })}, ${time}`;
    }
  }

  return (
    <time dateTime={iso} title={isClient ? date.toLocaleString() : undefined}>
      {label}
    </time>
  );
}
