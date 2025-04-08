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
  { name: 'Events', href: '/events' },
  { name: 'Feed', href: '/feed' },
  //{ name: 'Tags', href: '/tags' },
  //{ name: 'Members', href: '/members' },
  { name: 'Chat', href: '/messages' },
];

export function InnerNavbar() {
  const pathname = usePathname();

  return (
    <div className="">
      <div className="container mx-auto flex justify-center px-4 py-4">
        {/* Logo and title side by side */}
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
            <h2 className="text-3xl font-semibold">All Community Members</h2>
            <p className="text-lg text-black-300">
              Let's help families come to terms and live well with a terminal illness with and for each other
            </p>
          </div>
        </div>
      </div>
      
      {/* Centered tabs */}
      <div className="container mx-auto">
        <nav className="flex justify-center overflow-x-auto border-b border-gray-700">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex h-10 items-center px-4 text-lg font-medium transition-colors",
                pathname === item.href
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-black-300 hover:text-black-300"
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