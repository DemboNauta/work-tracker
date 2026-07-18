"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  ScanText,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/turnos", label: "Turnos", icon: CalendarClock },
  { href: "/importar", label: "OCR", icon: ScanText },
  { href: "/nominas", label: "Nóminas", icon: FileText },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-sidebar/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] transition-colors",
                active
                  ? "font-semibold text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "drop-shadow-[0_0_6px_var(--primary)]")} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
