"use client";

import type { ReactNode } from "react";

export function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "xl";
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={
          size === "xl"
            ? "w-full max-w-3xl rounded-sm border border-[var(--lte-line)] bg-white shadow-lg"
            : "w-full max-w-lg rounded-sm border border-[var(--lte-line)] bg-white shadow-lg"
        }
      >
        <div className="flex items-center justify-between border-b border-[var(--lte-line)] bg-[#f7f7f7] px-4 py-2.5">
          <h2 id="dialog-title" className="text-sm font-semibold text-[#444]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-[var(--lte-muted)] hover:text-[#333]"
          >
            Tutup
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[var(--lte-line)] bg-[#fafafa] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
