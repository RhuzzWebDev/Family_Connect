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

  // Determine the title and subtitle based on the current route
  const getPageInfo = () => {
    if (pathname?.includes('/dashboard')) {
      return {
        title: 'Family Dashboard',
        subtitle: 'Stay connected with your family members and latest activities'
      };
    } else if (pathname?.includes('/questions')) {
      return {
        title: 'Family Questions',
        subtitle: 'Ask and answer questions to stay connected with your family'
      };
    } else if (pathname?.includes('/events')) {
      return {
        title: 'Family Events',
        subtitle: 'Schedule and RSVP for upcoming family gatherings and events'
      };
    } else if (pathname?.includes('/members')) {
      return {
        title: 'Family Members',
        subtitle: 'View and connect with all your family members'
      };
    } else {
      return {
        title: 'Family Connect',
        subtitle: 'Bringing families closer together'
      };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="bg-[#1E1F29] mt-[-1px]">
      {/* Header with logo and title */}
      <div className="container mx-auto px-6 py-3 flex justify-center">
        <div className="flex items-center">
          <img 
            src="/logo.svg" 
            alt="Family Connect Logo" 
            className="h-10 w-10 rounded-full mr-4"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/logo.svg';
            }}
          />
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-300">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation tabs */}
      <div className="w-full">
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