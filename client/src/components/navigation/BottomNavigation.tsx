import { Link, useLocation } from 'wouter';
import { Home, Compass, Users, User, Star, Activity } from 'lucide-react';

export default function BottomNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/discover', icon: Compass, label: 'Explore' },
    { href: '/circles', icon: Users, label: 'Circles' },
    { href: '/profile', icon: User, label: 'Profile' }
  ];

  return (
    <nav className="mobile-navigation fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || 
            (href === '/feed' && (location === '/' || location === '/feed')) || 
            (href !== '/feed' && href !== '/' && location.startsWith(href));
          
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-0 ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="text-xs font-medium truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}