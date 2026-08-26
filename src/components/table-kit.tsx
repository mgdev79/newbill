"use client";

import type { ReactNode } from "react";
import { Button, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

export const PAGE_SIZES = [10, 25, 50, 100];

export function SortHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 font-semibold text-[#333]"
    >
      {label}
      <span className="inline-flex flex-col -space-y-0.5 text-[8px] leading-none" aria-hidden>
        <span className={active && dir === "asc" ? "text-[#444]" : "text-[#c5c5c5]"}>▲</span>
        <span className={active && dir === "desc" ? "text-[#444]" : "text-[#c5c5c5]"}>▼</span>
      </span>
    </button>
  );
}

export function TableToolbar({
  pageSize,
  onPageSize,
  query,
  onQuery,
  searchId,
}: {
  pageSize: number;
  onPageSize: (n: number) => void;
  query: string;
  onQuery: (q: string) => void;
  searchId: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <label className="flex items-center gap-2 text-[13px] text-[#444]">
        Show
        <select
          className={cn(inputClass, "w-[70px]")}
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        entries
      </label>
      <label className="flex items-center gap-2 text-[13px] text-[#444]">
        Search:
        <input
          id={searchId}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          className={cn(inputClass, "w-[220px]")}
        />
      </label>
    </div>
  );
}

export function TablePager({
  from,
  to,
  total,
  page,
  pageCount,
  onPage,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#444]">
      <p>
        Showing {from} to {to} of {total} entries
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          className="h-7 px-2"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        {Array.from({ length: pageCount }, (_, i) => i + 1)
          .filter((n) => n === 1 || n === pageCount || Math.abs(n - page) <= 2)
          .map((n, index, list) => (
            <span key={n} className="contents">
              {index > 0 && list[index - 1] !== n - 1 ? (
                <span className="px-1 text-[var(--lte-muted)]">…</span>
              ) : null}
              <button
                type="button"
                onClick={() => onPage(n)}
                className={
                  n === page
                    ? "inline-flex h-7 min-w-7 items-center justify-center rounded-sm bg-[var(--lte-blue)] px-2 text-white"
                    : "inline-flex h-7 min-w-7 items-center justify-center rounded-sm border border-[var(--lte-line)] bg-white px-2 hover:bg-[#f4f4f4]"
                }
              >
                {n}
              </button>
            </span>
          ))}
        <Button
          variant="secondary"
          className="h-7 px-2"
          disabled={page >= pageCount}
          onClick={() => onPage(Math.min(pageCount, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function IconBtn({
  title,
  className,
  disabled,
  onClick,
  children,
}: {
  title: string;
  className: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm text-white disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
