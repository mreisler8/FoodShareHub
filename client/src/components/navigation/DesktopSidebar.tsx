import { Home, Search, PlusCircle, Users, Bookmark, User as UserIcon, LogIn, LogOut, List, Settings, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-current-user";

export function DesktopSidebar() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  
  // Get current user
  const { data: currentUser, isLoading } = useQuery<User | undefined>({
    queryKey: ["/api/me"],
  });
  
  const isAuthenticated = !!currentUser;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    if (path === "/" && location === "/") {
      return true;
    }
    return path !== "/" && location.startsWith(path);
  };

  const getNavItemClasses = (path: string) => {
    return `flex items-center p-3 lg:p-3.5 rounded-xl font-medium transition-all duration-200 focus-improved ${
      isActive(path)
        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
        : "hover:bg-soft-sand-50 text-foreground hover:text-primary border border-transparent"
    }`;
  };

  return (
    <div className="nav-desktop md:flex-col md:w-56 lg:w-64 bg-background/95 backdrop-blur-sm p-4 lg:p-4 h-screen sticky top-0 border-r border-soft-sand-30">
      <Link href="/" className="flex items-center mb-6 hover:opacity-80 transition-opacity" aria-label="Go to home page">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-label="Circles app logo"
            role="img"
          >
            <path d="M15 11h.01"></path>
            <path d="M11 15h.01"></path>
            <path d="M16 16h.01"></path>
            <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"></path>
            <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"></path>
          </svg>
        </div>
        <h1 className="ml-3 text-2xl font-heading font-bold text-neutral-900">Circles</h1>
      </Link>
      
      <nav className="flex-1" role="navigation" aria-label="Main navigation">
        <ul className="space-y-2">
          <li>
            <Link href="/" aria-label="View your feed">
              <div className={getNavItemClasses("/")} role="menuitem" tabIndex={0}>
                <Home className="w-6 mr-2" aria-hidden="true" />
                <span>Feed</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/discover" aria-label="Discover new restaurants">
              <div className={getNavItemClasses("/discover")} role="menuitem" tabIndex={0}>
                <Search className="w-6 mr-2" aria-hidden="true" />
                <span>Discover</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/user-discovery" aria-label="Find and connect with users">
              <div className={getNavItemClasses("/user-discovery")} role="menuitem" tabIndex={0}>
                <Users className="w-6 mr-2" aria-hidden="true" />
                <span>Find People</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/create-post" aria-label="Create a new post">
              <div className={getNavItemClasses("/create-post")} role="menuitem" tabIndex={0}>
                <PlusCircle className="w-6 mr-2" aria-hidden="true" />
                <span>Create Post</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/circles" aria-label="View your circles">
              <div className={getNavItemClasses("/circles")} role="menuitem" tabIndex={0}>
                <Users className="w-6 mr-2" aria-hidden="true" />
                <span>Circles</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/lists" aria-label="View your restaurant lists">
              <div className={getNavItemClasses("/lists")} role="menuitem" tabIndex={0}>
                <List className="w-6 mr-2" aria-hidden="true" />
                <span>My Lists</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/lists/create" aria-label="Create a new restaurant list">
              <div className={getNavItemClasses("/lists/create")} role="menuitem" tabIndex={0}>
                <PlusCircle className="w-6 mr-2" aria-hidden="true" />
                <span>Create List</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/settings" aria-label="Account settings">
              <div className={getNavItemClasses("/settings")} role="menuitem" tabIndex={0}>
                <Settings className="w-6 mr-2" aria-hidden="true" />
                <span>Settings</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/saved">
              <div className={getNavItemClasses("/saved")}>
                <Bookmark className="w-6 mr-2" />
                <span>Saved Restaurants</span>
              </div>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="mt-auto pt-5 border-t border-neutral-200">
        <Link href="/profile">
          <div className="flex items-center p-3 rounded-lg hover:bg-neutral-100 cursor-pointer">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser?.profilePicture || ''} alt={currentUser?.name || 'User'} />
              <AvatarFallback>{currentUser?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="font-medium text-neutral-900">{currentUser?.name || 'User'}</p>
              <p className="text-sm text-neutral-500">@{currentUser?.username || 'user'}</p>
            </div>
          </div>
        </Link>
        <div 
          className="flex items-center p-3 mt-2 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer" 
          onClick={handleLogout}
        >
          <LogOut className="w-6 mr-2" />
          <span>Logout</span>
        </div>
      </div>
    </div>
  );
}
