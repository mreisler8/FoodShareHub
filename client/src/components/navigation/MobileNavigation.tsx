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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm shadow-lg z-50 border-t border-border" style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}>
      <div className="flex justify-around items-center h-14 max-h-14 px-2">
        <Link href="/" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center transition-colors ${isActive('/') ? 'text-primary' : 'text-muted-foreground'} hover:text-primary touch-manipulation`}>
            <Home className="h-4 w-4" />
            <span className="text-xs mt-0.5">Home</span>
          </div>
        </Link>
        
        <Link href="/discover" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center transition-colors ${isActive('/discover') ? 'text-primary' : 'text-muted-foreground'} hover:text-primary touch-manipulation`}>
            <Search className="h-4 w-4" />
            <span className="text-xs mt-0.5">Discover</span>
          </div>
        </Link>
        
        <Link href="/lists" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center transition-colors ${location.startsWith('/lists') ? 'text-primary' : 'text-muted-foreground'} hover:text-primary touch-manipulation`}>
            <List className="h-4 w-4" />
            <span className="text-xs mt-0.5">Lists</span>
          </div>
        </Link>
        
        {isAuthenticated ? (
          <>
            <Link href="/circles" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center transition-colors ${location.startsWith('/circles') ? 'text-primary' : 'text-muted-foreground'} hover:text-primary touch-manipulation`}>
                <Users className="h-4 w-4" />
                <span className="text-xs mt-0.5">Circles</span>
              </div>
            </Link>
            
            <Link href="/profile" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center transition-colors ${location.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground'} hover:text-primary touch-manipulation`}>
                <User className="h-4 w-4" />
                <span className="text-xs mt-0.5">Profile</span>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center transition-colors ${isActive('/auth') ? 'text-primary' : 'text-muted-foreground'} hover:text-primary touch-manipulation`}>
                <LogIn className="h-4 w-4" />
                <span className="text-xs mt-0.5">Login</span>
              </div>
            </Link>
            
            <button 
              className="flex-1 h-full outline-none border-0 bg-transparent transition-colors hover:text-red-400 touch-manipulation"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <div className="h-full flex flex-col items-center justify-center text-red-500">
                <LogOut className="h-4 w-4" />
                <span className="text-xs mt-0.5">Logout</span>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
