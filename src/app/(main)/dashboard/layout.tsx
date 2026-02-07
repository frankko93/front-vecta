import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth-guard";

import { SimpleSidebar } from "./_components/simple-sidebar";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <SimpleSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
