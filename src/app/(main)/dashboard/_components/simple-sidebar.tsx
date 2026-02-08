"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Building2, ChevronLeft, ChevronRight, Key, LogOut, Moon, Sun } from "lucide-react";

import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { CompanySelector, CompanySelectorCompact } from "@/components/company-selector";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { applyThemeMode } from "@/lib/preferences/theme-utils";
import { cn } from "@/lib/utils";
import { type NavGroup, type NavPermission, sidebarGroups } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

export function SimpleSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout, userCompanies, selectedCompany, isAuthenticated, isSuperAdmin, canManageSelectedCompanyUsers } =
    useAuth();
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const setThemeMode = usePreferencesStore((state) => state.setThemeMode);

  // Check if user has at least one company where they can view/edit
  const hasAnyViewAccess = userCompanies.length > 0;
  const hasAnyEditAccess = userCompanies.some((c) => c.role === "editor" || c.role === "admin");

  // Check if user has permission for a nav item (stable ref for useMemo deps)
  const hasPermission = useCallback(
    (permission?: NavPermission): boolean => {
      if (!permission || permission === "authenticated") return isAuthenticated;

      switch (permission) {
        case "can_view":
          return hasAnyViewAccess;
        case "can_edit":
          return hasAnyEditAccess;
        case "can_manage_users":
          return canManageSelectedCompanyUsers;
        case "super_admin":
          return isSuperAdmin;
        default:
          return false;
      }
    },
    [isAuthenticated, hasAnyViewAccess, hasAnyEditAccess, canManageSelectedCompanyUsers, isSuperAdmin],
  );

  // Filter navigation groups based on permissions
  const filteredGroups = useMemo(() => {
    return sidebarGroups
      .map((group): NavGroup | null => {
        // Filter items in the group
        const visibleItems = group.items.filter((item) => hasPermission(item.permission));

        // If group has a permission requirement, check it
        if (group.permission && !hasPermission(group.permission)) {
          return null;
        }

        // Only show group if it has visible items
        if (visibleItems.length === 0) {
          return null;
        }

        return { ...group, items: visibleItems };
      })
      .filter((group): group is NavGroup => group !== null);
  }, [hasPermission]);

  // Sync theme changes to DOM and persist
  useEffect(() => {
    applyThemeMode(themeMode);
    persistPreference("theme_mode", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    const newMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(newMode);
  };

  const isActive = (url: string): boolean => {
    if (url === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(url);
  };

  return (
    <div
      className={cn("h-screen flex-shrink-0 border-r bg-card transition-all duration-300", collapsed ? "w-16" : "w-64")}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Vecta</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", collapsed && "mx-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Company Selector - Only show if user has companies */}
        {userCompanies && userCompanies.length > 0 && (
          <div className="border-b px-2 py-3">{collapsed ? <CompanySelectorCompact /> : <CompanySelector />}</div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {filteredGroups.map((group) => (
            <div key={group.id} className="mb-6">
              {!collapsed && (
                <p className="mb-2 px-4 font-semibold text-muted-foreground text-xs uppercase">{group.label}</p>
              )}
              <div className="space-y-1 px-2">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <Link key={item.url} href={item.url}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          collapsed && "justify-center",
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <Separator />

        {/* Footer */}
        <div className="space-y-2 p-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("w-full", collapsed ? "mx-auto h-9 w-9" : "justify-start")}
            onClick={toggleTheme}
          >
            {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span className="ml-2">Tema</span>}
          </Button>

          {/* User */}
          {user && (
            <div className={cn("px-3 py-2 text-sm", collapsed && "px-0 text-center")}>
              {!collapsed ? (
                <div className="space-y-0.5">
                  <p className="font-medium">{user.first_name}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {selectedCompany ? selectedCompany.role : user.permissions[0]}
                  </p>
                </div>
              ) : (
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
                  {user.first_name.charAt(0)}
                  {user.last_name.charAt(0)}
                </div>
              )}
            </div>
          )}

          {/* Change Password */}
          <ChangePasswordDialog
            trigger={
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "sm"}
                className={cn("w-full", collapsed ? "mx-auto h-9 w-9" : "justify-start")}
              >
                <Key className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Contraseña</span>}
              </Button>
            }
            onSuccess={logout}
          />

          {/* Logout */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("w-full", collapsed ? "mx-auto h-9 w-9" : "justify-start")}
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Salir</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
