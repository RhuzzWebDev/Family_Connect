'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  //{ name: 'Resources', href: '/resources' },
  { name: 'Questions', href: '/questions' },
  { name: 'Events', href: '/events' },
  //{ name: 'Feed', href: '/feed' },
  //{ name: 'Tags', href: '/tags' },
  { name: 'Members', href: '/members' },
 // { name: 'Chat', href: '/messages' },
];

export function InnerNavbar() {
  const pathname = usePathname();

  return (
    <div className="">
      {/* Header with logo and title */}
      <div className="container mx-auto px-6 py-4 flex justify-center">
        <div className="flex items-center">
          <img 
            src="/logo.svg" 
            alt="Community Avatar" 
            className="h-10 w-10 rounded-full mr-4"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/logo.svg';
            }}
          />
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Community Members</h2>
            <p className="text-sm text-gray-600">
              Explore our resources. RSVP for our events. Discover our solutions.
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation tabs */}
      <div className="w-full border-b border-grey-900">
        <nav className="container mx-auto px-6 flex justify-center overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex h-12 items-center px-6 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}