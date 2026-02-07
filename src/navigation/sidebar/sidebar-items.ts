import { BarChart3, Building2, GitCompare, Home, type LucideIcon, Upload, Users } from "lucide-react";

/**
 * Permission requirements for navigation items
 * - "authenticated": Any logged-in user
 * - "can_view": User can view in at least one company (viewer+)
 * - "can_edit": User can edit in at least one company (editor+)
 * - "can_manage_users": User can manage users (company admin or super_admin)
 * - "super_admin": Only super_admin users
 */
export type NavPermission = "authenticated" | "can_view" | "can_edit" | "can_manage_users" | "super_admin";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: NavItem[];
  /** Required permission to see this item */
  permission?: NavPermission;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  /** Required permission to see this group (if not set, shows if any item is visible) */
  permission?: NavPermission;
}

/**
 * Sidebar navigation organized by groups
 */
export const sidebarGroups: NavGroup[] = [
  {
    id: "main",
    label: "Principal",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
        permission: "authenticated",
      },
      {
        title: "Reportes",
        url: "/dashboard/reports",
        icon: BarChart3,
        permission: "can_view",
      },
      {
        title: "Comparar Escenarios",
        url: "/dashboard/scenarios",
        icon: GitCompare,
        permission: "can_view",
      },
    ],
  },
  {
    id: "data",
    label: "Gestión de Datos",
    items: [
      {
        title: "Importar Datos",
        url: "/dashboard/import",
        icon: Upload,
        permission: "can_edit",
      },
    ],
  },
  {
    id: "config",
    label: "Configuración",
    permission: "super_admin",
    items: [
      {
        title: "Empresas",
        url: "/dashboard/companies",
        icon: Building2,
        permission: "super_admin",
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    items: [
      {
        title: "Usuarios",
        url: "/dashboard/users",
        icon: Users,
        permission: "can_manage_users",
      },
    ],
  },
];
