import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Shared page title block. Title + subline on the left, actions on the right;
 * on phones the actions wrap below the title rather than squeezing it.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  back,
  inlineActions = false,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  /** Keep (small) actions beside the title on phones instead of wrapping below. */
  inlineActions?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 flex w-fit items-center gap-1 rounded-full px-1 py-1 text-[13px] opacity-70 hover:opacity-100"
        >
          <ArrowLeft strokeWidth={2.75} size={14} />
          {back.label}
        </Link>
      )}
      <div
        className={`flex justify-between gap-x-4 gap-y-3 ${
          inlineActions ? "items-start" : "flex-wrap items-end"
        }`}
      >
        <div className="min-w-0">
          <h1 className="text-[28px] leading-[1.1] md:text-[34px]">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] opacity-60">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
