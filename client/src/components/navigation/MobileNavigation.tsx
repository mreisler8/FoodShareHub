import { Home, Search, PlusCircle, Users, User, LogIn, LogOut, List } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User as UserType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export function MobileNavigation() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  
  // Get current user
  const { data: currentUser } = useQuery<UserType | undefined>({
    queryKey: ["/api/me"],
  });
  
  const isAuthenticated = !!currentUser;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50 border-t border-gray-200" style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}>
      <div className="flex justify-around items-center h-16 max-h-16">
        <Link href="/" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center ${isActive('/') ? 'text-primary' : 'text-neutral-500'}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </div>
        </Link>
        
        <Link href="/discover" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center ${isActive('/discover') ? 'text-primary' : 'text-neutral-500'}`}>
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Discover</span>
          </div>
        </Link>
        
        <Link href="/lists" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center ${location.startsWith('/lists') ? 'text-primary' : 'text-neutral-500'}`}>
            <List className="h-5 w-5" />
            <span className="text-xs mt-1">Lists</span>
          </div>
        </Link>
        
        {isAuthenticated ? (
          <>
            <Link href="/circles" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center ${location.startsWith('/circles') ? 'text-primary' : 'text-neutral-500'}`}>
                <Users className="h-5 w-5" />
                <span className="text-xs mt-1">Circles</span>
              </div>
            </Link>
            
            <Link href="/profile" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center ${location.startsWith('/profile') ? 'text-primary' : 'text-neutral-500'}`}>
                <User className="h-5 w-5" />
                <span className="text-xs mt-1">Profile</span>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center ${isActive('/auth') ? 'text-primary' : 'text-neutral-500'}`}>
                <LogIn className="h-5 w-5" />
                <span className="text-xs mt-1">Login</span>
              </div>
            </Link>
            
            <button 
              className="flex-1 h-full outline-none border-0 bg-transparent"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <div className="h-full flex flex-col items-center justify-center text-red-500">
                <LogOut className="h-5 w-5" />
                <span className="text-xs mt-1">Logout</span>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
