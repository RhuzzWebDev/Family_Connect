'use client';

import { Header } from "./Header";
import { Sidebar } from "@/components/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const userEmail = sessionStorage.getItem('userEmail');

  if (!userEmail) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-64px)]">
        <aside className="hidden md:block w-64 border-r bg-background fixed top-16 bottom-0">
          <Sidebar />
        </aside>
        <main className="flex-1 md:pl-64 w-full">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
