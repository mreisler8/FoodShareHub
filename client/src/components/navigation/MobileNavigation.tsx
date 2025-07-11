import { Home, Search, PlusCircle, Users, User, LogIn, LogOut, List, Settings, TrendingUp } from "lucide-react";
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
    <div className="nav-mobile bg-background/98 backdrop-blur-md shadow-lg border-t border-soft-sand-30" style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)'}}>
      <div className="flex justify-around items-center h-16 px-3 max-w-screen-sm mx-auto">
        <Link href="/" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center transition-all duration-200 mobile-button rounded-lg ${isActive('/') ? 'text-primary bg-primary/10' : 'text-muted-foreground'} hover:text-primary hover:bg-primary/5 touch-manipulation`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">Home</span>
          </div>
        </Link>
        
        <Link href="/discover" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center transition-all duration-200 mobile-button rounded-lg ${isActive('/discover') ? 'text-primary bg-primary/10' : 'text-muted-foreground'} hover:text-primary hover:bg-primary/5 touch-manipulation`}>
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">Discover</span>
          </div>
        </Link>
        
        <Link href="/lists" className="flex-1 h-full">
          <div className={`h-full flex flex-col items-center justify-center transition-all duration-200 mobile-button rounded-lg ${location.startsWith('/lists') ? 'text-primary bg-primary/10' : 'text-muted-foreground'} hover:text-primary hover:bg-primary/5 touch-manipulation`}>
            <List className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">Lists</span>
          </div>
        </Link>
        
        {isAuthenticated ? (
          <>
            <Link href="/circles" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center transition-all duration-200 mobile-button rounded-lg ${location.startsWith('/circles') ? 'text-primary bg-primary/10' : 'text-muted-foreground'} hover:text-primary hover:bg-primary/5 touch-manipulation`}>
                <Users className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">Circles</span>
              </div>
            </Link>
            
            <Link href="/profile" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center transition-all duration-200 mobile-button rounded-lg ${location.startsWith('/profile') ? 'text-primary bg-primary/10' : 'text-muted-foreground'} hover:text-primary hover:bg-primary/5 touch-manipulation`}>
                <User className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">Profile</span>
              </div>
            </Link>
            

          </>
        ) : (
          <>
            <Link href="/auth" className="flex-1 h-full">
              <div className={`h-full flex flex-col items-center justify-center transition-all duration-200 mobile-button rounded-lg ${isActive('/auth') ? 'text-primary bg-primary/10' : 'text-muted-foreground'} hover:text-primary hover:bg-primary/5 touch-manipulation`}>
                <LogIn className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">Login</span>
              </div>
            </Link>
            
            <button 
              className="flex-1 h-full outline-none border-0 bg-transparent transition-all duration-200 mobile-button rounded-lg hover:text-red-400 hover:bg-red-50 touch-manipulation"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <div className="h-full flex flex-col items-center justify-center text-red-500">
                <LogOut className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">Logout</span>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
