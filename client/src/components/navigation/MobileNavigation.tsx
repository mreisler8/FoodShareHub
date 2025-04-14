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
          <div className={`flex flex-col items-center justify-center cursor-pointer ${isActive('/') ? 'text-primary' : 'text-neutral-500'}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </div>
        </Link>
        <Link href="/discover">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${isActive('/discover') ? 'text-primary' : 'text-neutral-500'}`}>
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Discover</span>
          </div>
        </Link>
        <Link href="/create-post">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${isActive('/create-post') ? 'text-primary' : 'text-neutral-500'}`}>
            <PlusCircle className="h-5 w-5" />
            <span className="text-xs mt-1">Post</span>
          </div>
        </Link>
        <Link href="/circles/1">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${location.startsWith('/circles') ? 'text-primary' : 'text-neutral-500'}`}>
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Circles</span>
          </div>
        </Link>
        <Link href="/profile">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${location.startsWith('/profile') ? 'text-primary' : 'text-neutral-500'}`}>
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
