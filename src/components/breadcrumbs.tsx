"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

/**
 * Breadcrumbs component
 * Automatically generates breadcrumbs from the current path
 */
export function Breadcrumbs() {
  const pathname = usePathname();

  const paths = pathname.split("/").filter(Boolean);

  const breadcrumbs = paths.map((path, index) => {
    const href = `/${paths.slice(0, index + 1).join("/")}`;
    const label = path.charAt(0).toUpperCase() + path.slice(1);

    // Translate common paths to Spanish
    const translations: Record<string, string> = {
      dashboard: "Dashboard",
      companies: "Empresas",
      import: "Importar",
      reports: "Reportes",
      scenarios: "Escenarios",
      users: "Usuarios",
    };

    return {
      label: translations[path] || label,
      href,
      isLast: index === paths.length - 1,
    };
  });

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="mb-4 flex items-center gap-2 text-muted-foreground text-sm">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="transition-colors hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
