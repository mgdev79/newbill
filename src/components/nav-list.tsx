"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useShell } from "@/components/shell-context";
import { navGroups, pathMatches } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5 px-0">
      {navGroups.map((group) => {
        if (group.href) {
          const active = pathMatches(pathname, group.href);
          const Icon = group.icon;
          return (
            <Link
              key={group.href}
              href={group.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 border-l-[3px] px-4 py-2.5 text-[13px] transition",
                active
                  ? "border-[var(--lte-blue)] bg-[#1e282c] text-white"
                  : "border-transparent text-[#b8c7ce] hover:bg-[#1e282c] hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {group.label}
            </Link>
          );
        }

        const openByPath = group.items?.some((item) =>
          pathMatches(pathname, item.href),
        );
        return (
          <NavBranch
            key={group.label}
            group={group}
            defaultOpen={Boolean(openByPath)}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

function NavBranch({
  group,
  defaultOpen,
  pathname,
  onNavigate,
}: {
  group: (typeof navGroups)[number];
  defaultOpen: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;
  const childActive = group.items?.some((item) => pathMatches(pathname, item.href));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2.5 border-l-[3px] px-4 py-2.5 text-left text-[13px] transition",
          childActive
            ? "border-[var(--lte-blue)] bg-[#1e282c] text-white"
            : "border-transparent text-[#b8c7ce] hover:bg-[#1e282c] hover:text-white",
        )}
      >
        <Icon className="size-4 shrink-0 opacity-80" />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          className={cn("size-3.5 opacity-70 transition", open ? "rotate-180" : "")}
        />
      </button>
      {open ? (
        <div className="bg-[#2c3b41]">
          {group.items?.map((item) => {
            const active = pathMatches(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "block border-l-[3px] py-2 pr-3 pl-10 text-[13px]",
                  active
                    ? "border-[var(--lte-blue)] bg-[#1e282c] text-white"
                    : "border-transparent text-[#8aa4af] hover:bg-[#1e282c] hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function BrandBlock() {
  const { company } = useShell();
  return (
    <div className="flex h-[50px] items-center gap-2 bg-[var(--lte-blue-dark)] px-4">
      <span className="flex size-7 items-center justify-center rounded bg-white/15 text-xs font-bold text-white">
        NB
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-white">{company.name}</p>
        <p className="truncate text-[10px] text-white/70">{company.tenant}</p>
      </div>
    </div>
  );
}
