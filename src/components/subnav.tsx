import Link from "next/link";
import { cn } from "@/lib/utils";

export function Subnav({
  items,
  current,
}: {
  items: { href: string; label: string }[];
  current: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-sm px-2.5 py-1 text-[12px] font-medium",
            current === item.href
              ? "bg-[var(--lte-blue)] text-white"
              : "border border-[var(--lte-line)] bg-white text-[#555]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
