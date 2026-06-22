"use client";

import { useEffect } from "react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/AuthContext";
import { canAccess } from "@/app/lib/access";
import { DataInitializer } from "@/components/components/DataInitializer";
import { MobileNav, Sidebar } from "@/components/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, currentStaff, loading, staffLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || staffLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canAccess(pathname, currentStaff?.role)) {
    notFound();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DataInitializer />
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background p-6 pt-16 md:pt-6">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
