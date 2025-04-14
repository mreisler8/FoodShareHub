import { Home, Search, PlusCircle, Users, User } from "lucide-react";
import { Link, useLocation } from "wouter";

export function MobileNavigation() {
  const [location] = useLocation();
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        <Link href="/">
          <a className={`flex flex-col items-center justify-center ${isActive('/') ? 'text-primary' : 'text-neutral-500'}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </a>
        </Link>
        <Link href="/discover">
          <a className={`flex flex-col items-center justify-center ${isActive('/discover') ? 'text-primary' : 'text-neutral-500'}`}>
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Discover</span>
          </a>
        </Link>
        <Link href="/create-post">
          <a className={`flex flex-col items-center justify-center ${isActive('/create-post') ? 'text-primary' : 'text-neutral-500'}`}>
            <PlusCircle className="h-5 w-5" />
            <span className="text-xs mt-1">Post</span>
          </a>
        </Link>
        <Link href="/hubs/1">
          <a className={`flex flex-col items-center justify-center ${location.startsWith('/hubs') ? 'text-primary' : 'text-neutral-500'}`}>
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Hubs</span>
          </a>
        </Link>
        <Link href="/profile">
          <a className={`flex flex-col items-center justify-center ${location.startsWith('/profile') ? 'text-primary' : 'text-neutral-500'}`}>
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </a>
        </Link>
      </div>
    </div>
  );
}
