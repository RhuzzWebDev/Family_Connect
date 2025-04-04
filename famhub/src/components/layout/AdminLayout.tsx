'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseService } from '@/services/supabaseService';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  User, 
  Menu, 
  X,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Admin } from '@/lib/supabase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First try to get the admin from Supabase Auth
        const authAdmin = await SupabaseService.getCurrentAuthAdmin();
        
        if (authAdmin) {
          setAdmin(authAdmin);
          setLoading(false);
          return;
        }
        
        // Fallback to session/local storage for backward compatibility
        const adminEmail = sessionStorage.getItem('adminEmail') || localStorage.getItem('adminEmail');
        if (!adminEmail) {
          router.push('/admin/login');
          return;
        }
        
        // Ensure both storage mechanisms have the admin email
        sessionStorage.setItem('adminEmail', adminEmail);
        localStorage.setItem('adminEmail', adminEmail);

        const adminData = await SupabaseService.getAdminByEmail(adminEmail);
        if (!adminData) {
          sessionStorage.removeItem('adminEmail');
          localStorage.removeItem('adminEmail');
          router.push('/admin/login');
          return;
        }

        setAdmin(adminData);
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear all auth data
        sessionStorage.removeItem('adminEmail');
        localStorage.removeItem('adminEmail');
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      // Sign out using Supabase Auth
      await SupabaseService.adminSignOut();
      // No need to manually clear session/local storage as it's handled in the service
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to manual logout if Supabase Auth fails
      sessionStorage.removeItem('adminEmail');
      localStorage.removeItem('adminEmail');
      router.push('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5 mr-2" /> },
    { href: '/admin/families', label: 'Families Management', icon: <Users className="h-5 w-5 mr-2" /> },
   // { href: '/admin/admins', label: 'Admin Management', icon: <User className="h-5 w-5 mr-2" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-primary">AWFM-Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 ml-2 md:hidden">
              Admin Panel
            </h1>
          </div>
          
          {admin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                    {admin.first_name[0]}
                  </div>
                  <span className="hidden md:inline">{admin.first_name} {admin.last_name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium">{admin.first_name} {admin.last_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{admin.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Role: {admin.role}</p>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
