"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Menu, X, LogOut, Home, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions/roles";

export type DashboardNavItem = { name: string; icon: LucideIcon; href: string };

export function DashboardLayout({
  userName,
  userRole,
  navigation,
  notificationBell,
  children,
}: {
  userName: string;
  userRole: UserRole;
  navigation: DashboardNavItem[];
  notificationBell?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="p-2 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X /> : <Menu />}
              </button>
              <Link href="/" className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                <span className="hidden text-gray-900 sm:inline">College Portal</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {notificationBell}
              <div className="hidden text-right sm:block">
                <p className="text-sm text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[userRole]}</p>
              </div>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 left-0 z-30 mt-16 w-64 border-r bg-white transition-transform duration-200 ease-in-out lg:static lg:mt-0 lg:translate-x-0`}
        >
          <nav className="space-y-2 p-4">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}

            <Link
              href="/"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="h-5 w-5" />
              <span>Back to Website</span>
            </Link>
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 mt-16 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
