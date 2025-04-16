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
    <div className="bg-[#1E1F29]">
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
            <h2 className="text-xl font-bold text-white">All Community Members</h2>
            <p className="text-sm text-gray-300">
              Explore our resources. RSVP for our events. Discover our solutions.
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation tabs */}
      <div className="w-full border-b border-[#232336]">
        <nav className="container mx-auto px-6 flex justify-center overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex h-12 items-center px-6 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "border-b-2 border-blue-400 text-blue-300 bg-[#181926]"
                  : "text-gray-300 hover:text-white hover:bg-[#181926]"
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