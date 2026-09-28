"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/**
 * Submit button that shows a spinner and disables itself while its parent
 * <form>'s Server Action is in flight. Drop-in for <button type="submit">
 * inside otherwise server-rendered forms.
 */
export default function SubmitButton({
  children,
  className = "",
  pendingLabel,
  confirm: confirmMessage,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Label while pending; defaults to `children`, pass null for spinner only. */
  pendingLabel?: React.ReactNode;
  /** If set, asks the user to confirm before submitting (for destructive actions). */
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      {...rest}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        rest.onClick?.(e);
      }}
      disabled={pending || rest.disabled}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending ? (
        <>
          <LoaderCircle strokeWidth={2.75} size={15} className="o-spin" />
          {pendingLabel === undefined ? children : pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
