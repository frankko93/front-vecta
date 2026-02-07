"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface CompanySelectorProps {
  /** Compact mode for sidebar */
  collapsed?: boolean;
  /** Additional class names */
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  editor: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  viewer: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
};

/**
 * Company Selector Component
 * Allows users to switch between companies they have access to
 * Shows the user's role for each company
 */
export function CompanySelector({ collapsed = false, className }: CompanySelectorProps) {
  const { userCompanies, selectedCompany, setSelectedCompanyId } = useAuth();

  // Don't render if user has no companies
  if (!userCompanies || userCompanies.length === 0) {
    return null;
  }

  // If user has only one company, show it without selector
  if (userCompanies.length === 1) {
    const company = userCompanies[0];
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2", className)}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between overflow-hidden">
            <span className="truncate font-medium text-sm">{company.company_name}</span>
            <Badge variant="outline" className={cn("ml-2 shrink-0", ROLE_COLORS[company.role])}>
              {ROLE_LABELS[company.role]}
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // Multiple companies - show selector
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          className={cn("justify-between", collapsed ? "h-9 w-9 p-0" : "w-full", className)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building2 className="h-4 w-4 shrink-0" />
            {!collapsed && selectedCompany && <span className="truncate">{selectedCompany.company_name}</span>}
          </div>
          {!collapsed && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar compañía..." />
          <CommandList>
            <CommandEmpty>No se encontraron compañías.</CommandEmpty>
            <CommandGroup heading="Tus compañías">
              {userCompanies.map((company) => (
                <CommandItem
                  key={company.company_id}
                  value={company.company_name}
                  onSelect={() => setSelectedCompanyId(company.company_id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selectedCompany?.company_id === company.company_id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{company.company_name}</span>
                  </div>
                  <Badge variant="outline" className={cn("ml-2 shrink-0", ROLE_COLORS[company.role])}>
                    {ROLE_LABELS[company.role]}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Compact company display for collapsed sidebar
 * Shows company initial and role indicator
 */
export function CompanySelectorCompact({ className }: { className?: string }) {
  const { userCompanies, selectedCompany, setSelectedCompanyId } = useAuth();

  if (!userCompanies || userCompanies.length === 0) {
    return null;
  }

  if (userCompanies.length === 1) {
    return (
      <div
        className={cn(
          "mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary",
          className,
        )}
        title={userCompanies[0].company_name}
      >
        <span className="font-semibold text-xs">{userCompanies[0].company_name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn("mx-auto h-9 w-9 p-0", className)}
          title={selectedCompany?.company_name || "Seleccionar compañía"}
        >
          <Building2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start" side="right">
        <Command>
          <CommandInput placeholder="Buscar compañía..." />
          <CommandList>
            <CommandEmpty>No se encontraron compañías.</CommandEmpty>
            <CommandGroup heading="Tus compañías">
              {userCompanies.map((company) => (
                <CommandItem
                  key={company.company_id}
                  value={company.company_name}
                  onSelect={() => setSelectedCompanyId(company.company_id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selectedCompany?.company_id === company.company_id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{company.company_name}</span>
                  </div>
                  <Badge variant="outline" className={cn("ml-2 shrink-0", ROLE_COLORS[company.role])}>
                    {ROLE_LABELS[company.role]}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
