import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: string[];
}) {
  const crumbs = breadcrumb ?? ["Home", title];
  return (
    <div className="mb-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-[var(--lte-line)] pb-2">
        <div>
          <h1 className="text-[22px] font-normal text-[#444]">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-[12px] text-[var(--lte-muted)]">{description}</p>
          ) : null}
        </div>
        <ol className="flex flex-wrap items-center gap-1 text-[12px] text-[var(--lte-muted)]">
          {crumbs.map((crumb, index) => (
            <li key={`${crumb}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <span>/</span> : null}
              <span className={index === crumbs.length - 1 ? "text-[var(--lte-blue)]" : ""}>
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {actions ? <div className="mb-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  title,
  tools,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  tools?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-sm border border-[var(--lte-line)] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]",
        className,
      )}
    >
      {title ? (
        <div className="flex items-center justify-between border-b border-[var(--lte-line)] bg-[#f7f7f7] px-3 py-2">
          <h2 className="text-sm font-semibold text-[#444]">{title}</h2>
          {tools}
        </div>
      ) : null}
      <div className={title ? "p-3" : "p-3"}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "slate" | "teal" | "amber" | "rose" | "sky" | "blue" | "green" | "aqua" | "yellow" | "red";
}) {
  const tones: Record<string, { bar: string; icon: string }> = {
    slate: { bar: "bg-[#605ca8]", icon: "bg-[#555299]" },
    teal: { bar: "bg-[#00a65a]", icon: "bg-[#008d4c]" },
    green: { bar: "bg-[#00a65a]", icon: "bg-[#008d4c]" },
    amber: { bar: "bg-[#f39c12]", icon: "bg-[#e08e0b]" },
    yellow: { bar: "bg-[#f39c12]", icon: "bg-[#e08e0b]" },
    rose: { bar: "bg-[#dd4b39]", icon: "bg-[#d73925]" },
    red: { bar: "bg-[#dd4b39]", icon: "bg-[#d73925]" },
    sky: { bar: "bg-[#00c0ef]", icon: "bg-[#00a7d0]" },
    aqua: { bar: "bg-[#00c0ef]", icon: "bg-[#00a7d0]" },
    blue: { bar: "bg-[#3c8dbc]", icon: "bg-[#367fa9]" },
  };
  const t = tones[tone] ?? tones.blue;

  return (
    <div className="flex min-h-[80px] overflow-hidden rounded-sm bg-white shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
      <div className={cn("flex w-[90px] shrink-0 items-center justify-center text-white", t.icon)}>
        <span className="text-2xl font-light opacity-90">◆</span>
      </div>
      <div className="flex flex-1 flex-col justify-center px-3 py-2">
        <p className="text-[12px] text-[var(--lte-muted)] uppercase">{label}</p>
        <p className="text-[22px] font-bold text-[#444]">{value}</p>
        {hint ? <p className="text-[11px] text-[var(--lte-muted)]">{hint}</p> : null}
      </div>
      <div className={cn("w-1 shrink-0", t.bar)} />
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    accept: "bg-[#00a65a] text-white",
    active: "bg-[#00a65a] text-white",
    reject: "bg-[#dd4b39] text-white",
    ok: "bg-[#00a65a] text-white",
    up: "bg-[#00a65a] text-white",
    paid: "bg-[#00a65a] text-white",
    used: "bg-[#777] text-white",
    pending: "bg-[#777] text-white",
    idle: "bg-[#777] text-white",
    isolated: "bg-[#f39c12] text-white",
    warn: "bg-[#f39c12] text-white",
    unpaid: "bg-[#f39c12] text-white",
    open: "bg-[#f39c12] text-white",
    disabled: "bg-[#dd4b39] text-white",
    down: "bg-[#dd4b39] text-white",
    void: "bg-[#dd4b39] text-white",
    closed: "bg-[#777] text-white",
    prepaid: "bg-[#00c0ef] text-white",
    postpaid: "bg-[#605ca8] text-white",
    admin: "bg-[#444] text-white",
    manager: "bg-[#00c0ef] text-white",
    operator: "bg-[#3c8dbc] text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-semibold capitalize",
        map[status] ?? "bg-[#777] text-white",
      )}
    >
      {status}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-[var(--lte-blue)] text-white hover:bg-[var(--lte-blue-dark)]",
    secondary: "border border-[var(--lte-line)] bg-white text-[#444] hover:bg-[#f4f4f4]",
    ghost: "text-[#444] hover:bg-[#f4f4f4]",
    danger: "bg-[#dd4b39] text-white hover:bg-[#d73925]",
  };
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-sm px-3 text-[13px] font-medium disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  className,
  hint,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <label className={cn("block text-[12px] font-semibold text-[#555]", className)}>
      {label}
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 font-normal text-[11px] text-[var(--lte-muted)]">{hint}</p> : null}
    </label>
  );
}

export const inputClass =
  "h-8 w-full rounded-sm border border-[var(--lte-line)] bg-white px-2.5 text-[13px] text-[#444] outline-none focus:border-[var(--lte-blue)] disabled:opacity-50";

export const textareaClass =
  "min-h-[280px] w-full rounded-sm border border-[var(--lte-line)] bg-[#1e282c] p-3 font-mono text-xs leading-5 text-[#b8c7ce] outline-none focus:border-[var(--lte-blue)]";
